App.Models.User = Backbone.Model.extend({
	urlRoot: "user"
});

App.Collections.TwitterUsers = Backbone.Collection.extend({
	model:App.Models.User,
	url: "list/members/",
	parse: function(response){
		return response.users;
	}
});

App.Models.TwitterList = Backbone.Model.extend({
	initialize: function() {
		this.users = new App.Collections.TwitterUsers;
	}, 
	urlRoot: "lists/"
});

App.Collections.TwitterLists = Backbone.Collection.extend({
   model: App.Models.TwitterList,
	url: function() {
    	return "lists/" + App.Models.currentUser.get("screen_name");
	}
});

App.Models.FriendsIds = Backbone.Model.extend({
	url: function(){
		return "friends/" + App.Models.currentUser.get("screen_name");
	}
});

App.Collections.UnlistedFriends = Backbone.Collection.extend({
	url: function() {
    	return "users/" + this.pluck("id").toString();
	}
});


