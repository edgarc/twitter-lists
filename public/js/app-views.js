 App.Views.TweetUserView = Backbone.View.extend({
	className: "user",
	
	attributes: {
		draggable: "true"
	},
	
	template: Handlebars.compile($("#twitter-friends").html()),
	
	events: {
		"dragstart": "handleDragStart",
	},
	
	initialize: function(){
	},
	
	render: function(){
		$(this.el).html(this.template(this.model.toJSON()));
		return this;
	},
	
	handleDragStart: function(e){
		var data = this.model.get("id_str") + "-" + this.id;
		App.Utils.DragStartListId = this.id;
		e.originalEvent.dataTransfer.setData('Text', data);
	}
	
 });

 App.Views.ListView = Backbone.View.extend({
	
	className: "list accordion-group span4",
	
	template: Handlebars.compile($("#twitter-list").html()),
	
	events: {
		"click 		.title" 	: "init",
		"click 		.edit-icon"	: "edit",
		"click 		.refresh"	: "refresh",
		"keypress 	.list-input": "updateOnEnter",
		"keyup 		.list-input": "updateOnEnter",
		"click 		.close" 	: "delete",
		
		"dragenter 	.list-name" : "handleDragEnter",
		"dragover 	.list-name" : "handleDragOver",
		"dragleave 	.list-name" : "handleDragLeave",
		"drop 		.list-name" : "handleDrop",
		"dragend 	.list-name" : "handleDragEnd"
	},
	
	initialize: function(options) {
		_.bindAll(this);
		this.initialized = false;
		this.model.bind('change', this.render, this);
		this.model.bind('destroy', this.remove, this);
		this.model.users.comparator = function(user) {
		  return user.get("following");
		};
		App.Utils.ListQueue[ this.model.get("id_str") ] = false;
		
		//load all list users 
		this.init();
    },

	update: function(){
		this.refresh();
	},

    render: function() {
		$(this.el).html(this.template(this.model.toJSON()));
		this.setListTypeDetails();
		this.$(".loader").hide();
		$("a").tooltip();
        return this;
    },
	
	init: function(){
		if(!this.initialized){
			this.loadListUsers();
			this.initialized = true;
		}
	},
	
	refresh: function(){
		this.$(".accordion-inner").html("")
		this.loadListUsers();
	},
	
	setListTypeDetails: function(){
		$(this.el).addClass(this.model.get("mode"));
		if (this.model.get("mode") == "private"){
			this.$(".mode").addClass("icon-lock");
			this.$(".label").addClass("label-important");
			this.$(".btn-group .private").addClass("active");
		}else{
			this.$(".mode").addClass("icon-eye-open");
			this.$(".label").addClass("label-success");
			this.$(".btn-group .public").addClass("active");
		}
	},

	addListMembers: function(){
		for(i=0; i<this.model.users.length; i++){
			var userModel = this.model.users.at(i);
			var userView = new App.Views.TweetUserView({
				model:userModel, id:this.model.get("id_str")
			});
			this.$(".accordion-inner").append(userView.render().el);
		}
	},
	
	checkListStatus: function(){
		var loaded = true;
		for (var list in App.Utils.ListQueue) {
			if (App.Utils.ListQueue[list] == false) 
				loaded = false;
		}
		if (loaded == true) App.Utils.dispatcher.trigger("lists_loaded");
	},
	
	getListMembers: function(collection, response){
		var cursor = response.next_cursor_str;
		var slug = this.model.get("slug");
		var user = this.model.get("user").screen_name;
		//fetch through twitter results cursor
		if ( cursor != "0" && cursor != undefined){
			this.model.users.fetch({
				data: $.param({ cursor: cursor, slug: slug, user:user}),
				add: true,
				success: this.getListMembers
			});
		}else{
			//once ready lets add the members
			App.Utils.ListQueue[this.model.get("id_str")] = true;
			this.checkListStatus();
			this.addListMembers();
			this.$(".loader").hide();
			this.$(".collapse").collapse('show');
		}
	}, 
	
	loadListUsers: function(){
		//reset modifiers
		this.model.set({ new_user_id: ""});
		this.model.set({ unlink_user_id: ""});
		
		var slug = this.model.get("slug");
		var user = this.model.get("user").screen_name;
		this.$(".loader").show();
		this.model.users.fetch({
			data: $.param({ slug: slug, user:user}),
			success: this.getListMembers
		});
	},
	
	edit: function(){
		$(this.el).addClass("editing");
		this.$('.list-input').focus();
	},
	
	updateOnEnter: function(e){
		if (e.keyCode == 27) $(this.el).removeClass("editing");
		if (e.keyCode == 13) this.close();
	},
	
	close: function(){
		var new_name = this.$('.list-input').val();
		var new_mode = this.$('button.active').text();
		
		if(new_name != this.model.get("name") || new_mode != this.model.get("mode")){
			this.model.save({name: new_name, mode:new_mode}, {success: this.update});
		}
		$(this.el).removeClass("editing");
	},
	
	delete: function(){
		this.model.destroy();
	},
	
	remove: function(){
		$(this.el).remove();
	},
	
 	cancel: function(e) {
	  if (e.preventDefault) {
	    e.preventDefault();
	  }
	  return false;
	},
	
	handleDragOver: function(e){
		if (e.preventDefault) {
		    e.preventDefault(); // Necessary. Allows us to drop.
		}

		if(App.Utils.DragStartListId != this.model.get("id_str")){
			this.$(".list-name").addClass("dragOver");
		}
		if(App.Utils.DragStartListId == this.model.get("id_str")){
			this.$(".list-name").addClass("dragOverUnlink");
		}
		return false;
	},
	
	handleDragEnter: function(e){
		if (e.preventDefault) {
		    e.preventDefault();
		  }
		
		if(App.Utils.DragStartListId != this.model.get("id_str")){
			this.$(".list-name").addClass("dragOver");
		}
		
		if(App.Utils.DragStartListId == this.model.get("id_str")){
			this.$(".list-name").addClass("dragOverUnlink");
		}
		return false;
	},
	
	handleDragLeave: function(e){
		this.$(".list-name").removeClass("dragOver");
		this.$(".list-name").removeClass("dragOverUnlink");
	},
	
	handleDrop: function(e){
		if (e.stopPropagation) {
		    e.stopPropagation(); // Stops some browsers from redirecting.
		}

		var data = e.originalEvent.dataTransfer.getData('Text');
		var params = data.split("-");
		var userId=params[0];
		var listId=params[1];
		if(listId != this.model.get("id_str")){
			//fix this hack where sending the new_user_id
			this.model.set({ new_user_id: userId}); 
			this.model.save( "new_user_id", userId, {
				success: this.dropSuccess,
				error: function(error){
					console.log(error);
			}});
			
		}else if(listId == this.model.get("id_str")){
			//fix this hack where sending the new_user_id
			this.model.set({ unlink_user_id: userId}); 
			this.model.save( "unlink_user_id", userId, {
				success: this.loadListUsers,
				error: function(error){
					console.log(error);
			}});
		}
	},
	
	handleDragEnd: function(e){
		this.$(".list-members").removeClass("dragOver");
	},
	
	dropSuccess: function(response){
		listedUser = response.get("new_user_id");
		$("#unlisted #"+listedUser).remove();
		this.loadListUsers();
	}
})

 App.Views.TwitterListsView = Backbone.View.extend({

	template: Handlebars.compile($("#twitter-lists-template").html()),
	
    el: $("#content"),

	className: "list",
	
	events:{
		"click #newlist"	: "addNewList",
		"click #expand"		: "expandLists",
		"click #collapse"	: "collapseLists",
		"click #show"		: "filterLists"
	},
	
	initialize: function(options) {
		_.bindAll(this);
		this.collection = options;
        this.collection.bind('reset', this.sort, this);
		this.render();
    },

	addNewList: function(options){
		//var newList = new App.Views.NewListView();
		App.Views.newList.show();
	},

	filterLists:function(e){
		var param = $(e.target).data("target");
		switch(param){
			case "all":
				$(".list.private").show()
				$(".list.public").show()
				break;
			case "public":
				$(".list.private").hide()
				$(".list.public").show()
				break;
			case "private":
				$(".list.private").show()
				$(".list.public").hide()
				break;
		}
	},
	
	expandLists: function(){
		$(".collapse").collapse("show");
	},
	
	collapseLists: function(){
		$(".collapse").collapse("hide");
	},
	
	render: function(){
		$(this.el).html(this.template());
		return this;
	},

    addOne: function(list) {
        var view = new App.Views.ListView({model: list});
        $("#list-container").append(view.render().el);
    },

	sort: function(){
		this.collection.comparator = function(list) {
		  return -list.get("member_count");
		};
		this.$("#list-title .total").text(this.collection.length)
		this.collection.sort({silent: true});
		this.collection.each(this.addOne);
		
		$("#list-container" ).sortable({cancel: ".accordion-inner"});
	}
	
})

 App.Views.UnlistedFriendsView = Backbone.View.extend({
	template: Handlebars.compile($("#unlisted-friends-template").html()),
	
	className: "list accordion-group span3",
	
	el: $("#content"),
	
	events:{
		"click #unlisted": "findUnlistedFriends"
	},
	
	initialize: function(options) {
		_.bindAll(this);
		this.collection = options;
		this.collection.bind('reset', this.addAll, this);
		this.initialized = false;
		this.render();
    },

	render: function(){
		$(this.el).append(this.template());
		return this;
	},

    addOne: function(friend) {
		var userView = new App.Views.TweetUserView({model:friend, id:"unlisted"});
		this.$("#friends-container").append(userView.render().el);
    },

	addAll: function(friends) {
		var unlistedUsers=friends.length.toString();
		this.$("#unlisted .total").html(" ("+unlistedUsers+")")
		friends.each(this.addOne);
		this.initialized = true;
		this.$("#unlisted-members.collapse").collapse('show');
    },

	refresh: function(){
		this.initialized=false;
		this.$("#friends-container").html("");
		this.findUnlistedFriends();
	},

	findUnlistedFriends: function(){
		if (! this.initialized){
			this.collection.reset({silent: true});
			unlisted = []
			var friends= []; 
			friends = App.Models.friends.get("ids");
			for(var i=0;i<friends.length;i++){
		 		if (! this.isUserOnList(friends[i])){
					this.collection.add({id: friends[i]});
				}
			}
			this.collection.fetch()
		}
	},

	isUserOnList: function(userId){
		var found=false;
		for(var i=0;i<App.Collections.twitterLists.length;i++){
			var listUsers = App.Collections.twitterLists.at(i).users;
			for(var j=0;j<listUsers.length;j++){
				if (userId==listUsers.at(j).get("id_str")){
					found = true;
				}
			}
		}
		return found;
	}
})

 App.Views.NewListView = Backbone.View.extend({
	el: $("#new-list-modal"),
	
	events:{
		"click #cancel" : "cancel",
		"click #save" 	: "save"
	},
	
	initialize: function(options) {
		_.bindAll(this);
    },

	show: function(){
		$(this.el).modal('show');
	},

	cancel: function(){
		$(this.el).modal('hide');
	},
	
	save: function(){
		var listName = this.$("input.list-input").val();
		var listMode = this.$("button.active").text();
		var newList = new App.Models.TwitterList();
		
		//do this here cause if i do it at the model it overrides the collection functionality to update and delete
		newList.url = "lists/"+App.Models.currentUser.get("screen_name");
		newList.save({
			name: listName,
			mode: listMode
		},
		{
			success: this.onListCreated,
			error: function(error){
				console.log(error);
			}
		});
	},
	
	onListCreated: function(response){
		var newListModel = new App.Models.TwitterList(response)
		App.Collections.twitterLists.add(newListModel);
		var view = new App.Views.ListView({model: newListModel});
        $("#list-container").append(view.render().el);
		$(this.el).modal('hide');
	}

})

 App.Views.ProfileView = Backbone.View.extend({
	template: Handlebars.compile($("#user-details-template").html()),
	
	initialize: function(options) {
		this.render();
    },
	
	render: function(){
		$("#top-nav").prepend(this.template(this.model.toJSON()));
	}
});