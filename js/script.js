/* Author:

*/



var game_of_profiles  = gop = {
    storage : {},
    friends_hash : {},
    loaded_pics : 0,
    friends_count : 25,
    init : function(){
//        FB.getLoginStatus(function(response){
//            $.publish('fb/status',response);
//        });
        gop.bindEvents();
    },
    bindEvents : function(){
        $.subscribe('fb/status',gop.ui.setState);
        $.subscribe('fb/connected',gop.connected);
        $.subscribe('fb/fetched_friends',gop.data.getPics);
        $.subscribe('fb/pic_loaded',gop.data.countPics);

        //user actions pubsub
        $.subscribe('game/wrong',gop.ui.userWrong);
        $.subscribe('game/correct',gop.ui.userCorrect);

        $.subscribe('game/correct',function(){
            console.log('user was correct');
        });
        $.subscribe('game/wrong',function(){
            console.log('user was wrong');
        });


        $('#game').on('click',function(){
            gop.ui.showOnePic();
            $('#game').off('click');
        });

        $('#stage').on('click', '.name' ,function(){
            gop.ui.userChoice(this);
        });

        FB.Event.subscribe('auth.statusChange',function(response) {
             $.publish('fb/status',response);
        });
    },
    connected : function(e,data){
        gop.data.getFriends();
    }
}



gop.data = {
    friends : {},
    getFriends : function(){
//        FB.api('/me/friends',function(obj){
//            $.each(obj.data,function(i,item){
//               gop.data.friends[item.id] = item;
//            });
//            $.publish('fb/fetched_friends');
//        });

        FB.api(
                {
                    method:'fql.query',
                    query: 'SELECT uid, name, sex FROM user WHERE uid IN (SELECT uid2 FROM friend WHERE uid1 = me())'
                },
                function (data) {
                    $.each(data,function(i,item){
                        gop.data.friends[item.uid] = item;
                    });
                    $.publish('fb/fetched_friends');
                }
        );
    },
    getPics : function(e,data){
        var random_friends = [];
        for (var i = 0; i <= gop.friends_count; i++) {
            var keys = Object.keys(gop.data.friends);
            var friend = keys[Math.floor(Math.random() * keys.length)];
            random_friends.push(gop.data.friends[friend].uid);
        }

        FB.api(
                {
                    method:'fql.query',
                    query: 'SELECT id,pic_crop FROM profile WHERE id in ('+ random_friends.join(",") +')'
                },
                function (data) {

                    $.each(data,function(i,item){
                        var guid = guidGenerator();
                        gop.friends_hash[guid] = item.id;
                        var $tmpl = $('<div class="prof_pic"><img src="" alt=""></div>');
                        $tmpl.find('img').attr(
                                {'src':this.pic_crop.uri,
                                 'id': guid,
                                 'width':180,
                                 'data-bottom':this.pic_crop.bottom,
                                 'data-top':this.pic_crop.top,
                                 'data-left':this.pic_crop.left,
                                 'data-right':this.pic_crop.right
                                });

                        $tmpl.find('img').on('load',function(){
                           $.publish('fb/pic_loaded')
                        });
                        $("#pics").append($tmpl);
                    })
                }
        );
//        var queries = {
//            albums : 'SELECT aid,owner,name FROM album WHERE owner in ('+ random_friends.join(",") +') AND type = "profile"',
//            pics : 'SELECT pid, src_big,src_small FROM photo WHERE aid in (SELECT aid FROM #albums)'
//        }
//        FB.api(
//                {
//                    method:'fql.multiquery',
//                    queries: JSON.stringify(queries)
//                },
//                function (data) {
//                    console.log(data);
//                    $.each(data[1].fql_result_set,function(){
//                        console.log(this.src_small);
//                        $('#game').append('<img src="'+this.src_small+'"/>');
//                    })
//                }
//        );

    },
    countPics : function(){
        gop.loaded_pics++;
        if(gop.loaded_pics < gop.friends_count){
            console.log(gop.friends_count - gop.loaded_pics + ' more pictures to go');
        }else{
            console.log('all done!');
        }
    },
    randomFriends : function(count,exclude){
        var count = count || 1;
        var keys = Object.keys(gop.data.friends);
        var friends = [];
        for(var i = 0; i< count;i++){
            var friend = keys[Math.floor(Math.random() * keys.length)];

            if(friend != exclude){
                friends.push(friend);
            }else{
                gop.data.randomFriends(1,exclude);
            }
        }
        return friends;
    }
}

gop.ui = {
    active_pic : null,
    setState:function (e, data) {
        status = data.status || 'disconnected';
        document.body.dataset.state = status;
        if (status == 'connected') {
            $.publish('fb/connected', status)
        }
    },
    showOnePic:function () {
        var rnd_num = Math.floor(Math.random() * $('#pics').find('.prof_pic').length);
        var rnd_pic = $('#pics').find('.prof_pic').eq(rnd_num);
        gop.ui.active_pic = rnd_pic.find('img').attr('id');
        $('#stage').empty().append(rnd_pic);

        var friend_id = gop.friends_hash[gop.ui.active_pic];
        var friends = gop.data.randomFriends(3,friend_id);
        friends.push(friend_id);

        var tmpl = $('<div class="name"></div>');
        for (var i = 0; i < friends.length; i++) {
            var friend = friends[i];
            tmpl.clone().html(gop.data.friends[friend].name).data('id',friend).appendTo('#stage');
        }
    },
    userChoice : function(elm){

        if(gop.friends_hash[gop.ui.active_pic] == $(elm).data('id')){
            $.publish('game/correct');
        }else{
            $.publish('game/wrong');
        }
        gop.ui.showOnePic();
    }
}
window.fbAsyncInit = gop.init;

