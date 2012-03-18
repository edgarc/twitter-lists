window.App = {
    Collections: {},
    Models: {},
    Views: {},
    Templates: {},
    Routers: {},
    Utils: {}
};

App.Utils.dispatcher = _.clone(Backbone.Events)

App.Routers.TwitterLists = Backbone.Router.extend({
    routes: {
        "index": "index"
    },

    initialize: function(options) {
		App.Models.currentUser = new App.Models.User();
		App.Models.currentUser.fetch({success: this.index, error: this.loginError})
    },
	
	loginError: function(e){
		$("#error").show();
	},

    index: function() {
		twitterify();
		$("#signin").remove();
		$("#top-nav").prepend('<li><a id="signout" href="#">Sign out</a></li>');
		$("#signout").bind("click", logOut);
		
		App.Views.profileView = new App.Views.ProfileView({model:App.Models.currentUser});
		App.Views.newList = new App.Views.NewListView()
		
        App.Collections.twitterLists = new App.Collections.TwitterLists();
		App.Collections.twitterLists.comparator = function(list){
	  		return list.get("member_count");
	 	};		
		App.Views.twitterListsView = new App.Views.TwitterListsView(App.Collections.twitterLists);
        App.Collections.twitterLists.fetch();

		App.Collections.unlistedFriends = new App.Collections.UnlistedFriends();
		App.Views.unlistedfriendsView = new  App.Views.UnlistedFriendsView(App.Collections.unlistedFriends);
		App.Utils.dispatcher.on("lists_loaded", App.Views.unlistedfriendsView.findUnlistedFriends)
		
		App.Models.friends = new App.Models.FriendsIds();
		App.Models.friends.fetch();
		
		App.Utils.ListQueue={}
    }
})

$(function() {
	$('#loading')
	 .hide() 
	 .ajaxStart(function() {
	    $(this).show();
	 })
	 .ajaxStop(function() {
	    $(this).hide();
	 });
	
    App.Routers.twitterLists = new App.Routers.TwitterLists();
    Backbone.history.start({
        pushState: true
    })
})

function twitterify(){
	twttr.anywhere(function(T) {
		//T.linkifyUsers();
        T("img").hovercards({
	      username: function(node) {
	        return node.alt;
	      }
	    });
	});
}

function logOut(){
	window.location = "/logout"
}