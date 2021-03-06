/* Author:

*/

var game_of_profiles  = gop = {
    storage : {},
    friends_hash : {},
    loaded_pics : 0,
    friends_count : 25,
    friends_per_level : 20,
    current_level : 1,
    current_level_place : 0,

    init : function(){
//        FB.getLoginStatus(function(response){
//            $.publish('fb/status',response);
//        });

        var box_height = box_width = 80;
        var box_count = Math.floor( ($(window).height() / box_height) * ($(window).width() / box_width));

        gop.friends_count = box_count;

        var tmpl = $('<div class="bg_pic"></div>');
        var tmpl_cont = $('<div id="bg_pics"></div>');
        for (var i = 0; i < box_count; i++) {
            tmpl_cont.append(tmpl.clone());
        }
        $('#main').prepend(tmpl_cont);
        //save cache of bg_pics
        gop.data.$bg_pics = $('.bg_pic');
        gop.bindEvents();
    },
    bindEvents : function(){
        $.subscribe('fb/status',gop.ui.setState);
        $.subscribe('fb/connected',gop.connected);
        $.subscribe('fb/fetched_friends',gop.data.getPics);
        $.subscribe('fb/pic_loaded',gop.data.countPics);
        $.subscribe('fb/pic_loaded',gop.ui.prepareBackground);

        //user actions pubsub
        $.subscribe('game/wrong',gop.ui.userWrong);
        $.subscribe('game/correct',gop.ui.userCorrect);

        $.subscribe('game/correct',function(){
            $('#right').animate({'opacity':1},100).animate({'opacity':0},100);
            console.log('user was correct');
        });
        $.subscribe('game/wrong',function(){
            $('#wrong').animate({'opacity':1},100).animate({'opacity':0},100);
            console.log('user was wrong');
        });


        $('#start').on('click',function(){
            gop.ui.showOnePic();
            $('#start').off('click');
        });

        $('#start_cont').on('click', '.name' ,function(){
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
                query:'SELECT uid, name, sex FROM user WHERE uid IN (SELECT uid2 FROM friend WHERE uid1 = me())'
            },
            function (data) {
                $.each(data, function (i, item) {
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
                        $.extend(gop.data.friends[item.id],item);
                        var $img = $('<img src=""/>');

                        $img.attr(
                                {'src':this.pic_crop.uri,
                                 'id': guid,
                                 'width':180,
                                 'data-bottom':this.pic_crop.bottom,
                                 'data-top':this.pic_crop.top,
                                 'data-left':this.pic_crop.left,
                                 'data-right':this.pic_crop.right
                                });

                        $img.on('load',function() {
                            $.publish('fb/pic_loaded',[i,item]);
                        });
//                        $("#pics").append($tmpl);
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
    prepareBackground : function(e,i,item){

        $cur_pic = gop.data.$bg_pics.eq(i);
        $cur_pic.css('background-image', 'url(' + item.pic_crop.uri + ')');
        $cur_pic.attr('id','friend'+item.id);
        window.setTimeout(function () {
            gop.data.$bg_pics.eq(i).addClass('loaded')
        }, Math.floor(Math.random() * 1500) + 20);
    },
    showOnePic:function () {
        if(gop.current_level_place >= gop.friends_per_level){
            alert('DONE!');
            return false;
        }else{
            gop.current_level_place++;
        }

        var friends_with_pics = Object.keys(gop.friends_hash);
        var rnd_num = Math.floor(Math.random() * friends_with_pics.length);

        gop.ui.active_friend = gop.data.friends[gop.friends_hash[friends_with_pics[rnd_num]]];
        var pic_uri = gop.ui.active_friend.pic_crop.uri;
        var $tmp_div = $('<div class="prof_pic"></div>');

        $tmp_div.css('background-image','url('+ pic_uri +')');
        $('#start_cont').empty().append($tmp_div);

        var friend_id = gop.ui.active_friend.id;
        var friends = gop.data.randomFriends(3,friend_id);
        friends.push(friend_id);
        friends.shuffle();
        var tmpl = $('<div class="name"></div>');
        var $tmpl_cont = $('<div class="names"></div>');
        for (var i = 0; i < friends.length; i++) {
            var friend = friends[i];
            tmpl.clone().html((i + 1) + '.'+ gop.data.friends[friend].name).data('id',friend).appendTo($tmpl_cont);
        }
        $tmpl_cont.appendTo('#start_cont');

    },
    userChoice : function(elm){
        if(gop.ui.active_friend.id == $(elm).data('id')){
            $.publish('game/correct');
        }else{
            $.publish('game/wrong');
        }
        gop.ui.showOnePic();
    }
}
window.fbAsyncInit = gop.init;

