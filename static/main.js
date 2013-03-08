/* jQuery plugins */
(function($) {
    $.fn.extend({
        isChildOf: function( filter_string ) {
            var parents = $(this).parents().get();
			              
            for ( j = 0; j < parents.length; j++ ) {
                if ( $(parents[j]).is(filter_string) ) {
                    return true;
                }
            }  
						                 
            return false;
        }
});
})(jQuery)




/* Main */

$(function(){
/* Backbone tweaks */
    var __  = __ || (function(Backbone){
        
        var backbonePrototypes = [
	        Backbone.Collection.prototype, 
	        Backbone.Model.prototype, 
	        Backbone.View.prototype,
	        //Backbone.Router.prototype
	    ];

        var exts = {
        
	    dispatcher: _.extend({}, Backbone.Events),
	    events: function() { 
	                var local = _.clone(Backbone.Events);
			var isEligibleForDispatcher = function (source) {
			    return !((source instanceof Backbone.Model) && 
				(source.collection instanceof Backbone.Collection)); 
			}
		        return {
		            "dispatcher" : __.dispacher,
			    "trigger": function() {
				var args = _.toArray(arguments);
				if (this._callbacks) {
				    local.trigger.apply(this, args);
				}
                                if (isEligibleForDispatcher(this)) { 
                                    __.dispatcher.trigger.apply(__.dispatcher, args);
				}
				return this
				}
			    }   
		   },

	    extend: function() {
		var self = this;
		_.each(backbonePrototypes,function(proto) {
		    _.extend(proto, self.events());
		});
	    }

	}
         
        return exts 
     })(Backbone);

    __.extend();
/* Global constants */
   var global;
   global = {
       "container"             : "#container",
       "container_admin"       : "#admin-entry-point",
       "container_resources"   : "#container-resources",
       "container_incoming"    : "#container-resources-list",
       "container_bookmarks"   : "#container-bookmarks",
       "container_topics"      : "#container-topics",
       "container_topic_desc"  : "#container-topic-desc",
       "container_panel_mid"   : "#panel-medium",
       "container_panel_big"   : "#panel-big",
       "container_topic_tree"  : "#topic-tree",
       "container_topic_info"  : "#topic-info",
       "container_topic_mgt"   : "#topic-mgt",
       "container_resource_mgt": "#resource-mgt",
       "template_resource"     : "#resource-template",
       "template_resource_edit": "#resource-template-edit",
       "template_resource_note": "#resource-template-note",
       "template_topic"        : "#topic-template",
       "template_button"       : "#button-template",
       "class_resource"        : "resource",
       "class_resource_edit"   : "resource-edit",
       "class_topic"           : "topic",
       "EVENTS"                : {
                                    "TOPICPINNED" : "topicpinned",
				    "GETPARENT"   : "getparent",
				    "SAVE"        : "savemodel",
				    "CONTROL"     : "showpanel",
				    "RIGHTMENU"   : "showmenu", 
				    "BOOKMARKVIEW": "bookmarkview", 
				    "GOTO"        : "goto", 
                                 }, 
       "msg"                   : "#msg" 
   };
/* Global behaviors */
   $("body").click(function(e) {
       if( !($(e.target).isChildOf('.panel') || $(e.target).hasClass('panel'))  ) {
           $('.panel:visible').fadeOut('fast');
       }      
   });

   $(".fright").bind("mousewheel", function(e, delta) {
       e.preventDefault();
       
       var y,ny, dir, h, sh, sy;  
       dir = delta >0 ? 20 : -20
       sh = $(global.container_topics).parent().height();
       h = $(global.container_topics).height();
       y = $(global.container_topics).offset().top;
       sy = $(global.container_topics).parent().offset().top;
       ny = y + dir;
       if (h+y < sy+sh && y<sy) {
	   ny = 0;
           $(global.container_topics).animate({ top: ny });
	   return 
       }
       else if (ny <=sy && h+ny >= sy+sh){
           $(global.container_topics).offset({ top: ny });
       }
   });
   var p = $(".wrapper");
   var h = $(window).height()-p.offset().top;
   p.height(h);
   p= $(global.container_resources);
   h = $(window).height()-p.offset().top;
   p.height(h);
   $(global.container_incoming).height(h);
   
   $(global.container_topic_mgt).parent().hide();
   $(global.container_resource_mgt).parent().hide();

/* Backbone Models & Collections  */

    var Btn = Backbone.Model.extend({
        defaluts: {
	    "event"  : "SOMEBUTTONCLICKED",
	    "text"   : "A Simple Button",
	},
        enabled : true
    });

    /* Resource model,threre is 
     * a global collection view "Gallery"
     * constructed from this. */
    var Resource = Backbone.Model.extend({
        defaults : {
	    "title"   : "A Sample Resource",
	    "link"    : "#",
	    "topic_id"   : null,
	    "type"    : "tut",
	    "note"    : "Some note texts"
	},
	
	initialize: function() {
	// stores a shortend copy of the resource title
            this.shorten();	
	},
        
        shorten: function() {
	    var t, dt; 
	    t = this.get('title');
	    dt = t.substring(0,35);
	    if (t !== dt) dt = dt + '...';
	    this.set({ 'dtitle' : dt });
	}, 

	destroy: function(options) {
	    options = options ? _.clone(options) : {};
	    var model = this;
	    var success = options.success;
	    var triggerDestroy = function() {
	        model.trigger('destroy', model, model.collection, options);
	    };

	    triggerDestroy();
	    return false;
	}

    });

    var ResourceList = Backbone.Collection.extend({
        model: Resource
    });

    /* a central piece to this application. a topic is a
     * nested Backbone model, all topics fall under a "ROOT"
     * topic, and that master node serves as a navigation
     * throughout the application. In addition to that, a globbal
     * library exists for all topic instances initiated on this 
     * page, named "AllTopics". */
   
    var Topic = Backbone.Model.extend({
        defaults: {
	    "name"         : "A Topic",
	    "description"  : "a topic here",
	    "subtopics"    : null,
	    "resources"    : null,
	},

	initialize: function(e) {
	    // this.attachSubtopics(e.subtopics);
	    // register this model to the global topics library
	    this.set( {"subtopics": (e.subtopics || new Array)} );
	    this.set( {"resources": (e.resources || new Array)} );
	    _.bindAll(this, "simpleJSON", "all_toJSON");
            AllTopics.add(this);
	},
	
	attachSubtopics : function( subtopics ) {

            var subs = this.get("subtopics");

	    if (! subtopics ) {
	        subtopics = _.clone(subs);
	    }
            
            subs.splice(0, subs.length);

	    if ( subtopics instanceof Array && subtopics.length ){

	        _.each(subtopics, function( topic ){
		    if (topic instanceof Topic){
			this.addChildren(topic);
		    } else if (topic instanceof Object) {
			var topic_model = new Topic(topic);
			this.addChildren(topic_model);
			topic_model.attachSubtopics();
		    }
	        }, this);	    
		

	    }
            return this 
	},

	addChildren: function(children) {
	    if (! (children instanceof Array) ) {
	        children = [children]
	    }
	    var counter, s, r;
	    counter = 0;
	    s = this.get("subtopics");
	    r = this.get("resources");
	    // Fixing a unknown bug, when model loses reference to 
	    // other Backbone models
	    _.each(s, function(e) {
	        if (! (e instanceof Topic)) {
		    e = AllTopics.getByCid(e.cid);
		}
	    }, this);


	    _.each(children, function(child){

	        if (child instanceof Topic) {
		    s.push(child);
		    counter ++;
		} else if (child instanceof Resource) {
		    r.push(child);
		}

	    }, this);	     
	    if (counter) {
	        root.trigger("change", counter);
	    }

	    return this
	},

	hasResourcesAttached: function() {
	    return this.get("resources").length		      
	},
	
	hasSubtopicsAttached: function() {
	    return this.get("subtopics").length	      
	},

        getResources: function(r) {
	    r = typeof r == 'undefined' ? [] : r;
	    var subtopics = this.get("subtopics");
	    var resources = this.get("resources");
	    if (!resources.length){
		// quick fail if topic has no resources
	        return r
	    }
	    r = r.concat(this.get("resources")); 	     
	    if (!subtopics.length){
		// bottom level on the topics tree
	        return r
	    }
	    _.each(subtopics, function(topic){
	        r = topic.getResources(r);
	    }, this);
	    return r
	},
// get an Array of subtopics models, [] if bottom of topics tree
	getSubs: function() {
	    var s = this.get("subtopics");    
	    if (s instanceof TopicList){
	        return s.models 
	    } else {
	        return s
	    }
	},
	simpleJSON: function(count){
	    var obj = {};
	    obj.cid = this.cid;
	    obj.name = this.get("name");
	    obj.subtopics = this.getSubs();
	    if (typeof count != "undefined") {
	        obj.resourcecount = this.hasResourcesAttached();
	        obj.subtopiccount = this.hasSubtopicsAttached();
	    }
	    return obj;
	},
// get the vanilla json representation of the model
	all_toJSON: function(t) {
	    t = typeof t == 'undefined' ? this : t;
	    var subtopics, topic;
	    if (t instanceof Topic) {
		t = t.simpleJSON();
	    } 
	    for (var j=0; j<t.subtopics.length; j++){
		var topic = t.subtopics[j];
		t.subtopics[j] = this.all_toJSON.call(this, topic);
	    }
	    return t
	}

    });
    
    var TopicList = Backbone.Collection.extend({
        model: Topic
    });   

// a basic form model 
    var Form = Backbone.Model.extend({
        
	initialize: function() {
	    _.bindAll(this, "load", "getType");	    
	},

        /* render options can be either specified by attributes name
	 * of type. when rendering, if attribute name is found in 
	 * renderOpts, then apply its setting; otherwise, it looks for 
	 * the setting of attribute type eg. string/number. if nothing 
	 * if found, just render a empty input tag; please use <input /> 
	 * only for now; other tags are not yet supported */

	renderOpts: {
	    "className": "",
	    "number"   : "input:number",	
	    "string"   : "input",
	    "format"   : "table"
	},

        load: function(f) {
	   this.set(this.getType(f));  
	   //quick yet imperfect check if f is a backbone Model Class
           
           this._Model = f;

	   return this
	},

	getType: function(f) {
	    
	    if (! f instanceof Object ) {
	        f = {}
	    } else if ( f.prototype && f.prototype.defaults ) {
		f = _.clone(f.prototype.defaults);
	    } 

	    for (key in f){
		if (f[key] instanceof Object) {
		    f[key] = this.getType(f[key]);
	        } else {
	            f[key] = typeof f[key] 
		}
	    }

            return f
	},
	// set some attributes on silent when rendering
	ignore: function(attrs) {
	    if (typeof attrs == 'string') {
	        attrs = [attrs];    
	    }

	    var ignored = true;
            _.each(attrs, function(attr) { 
	        if (this.ignore[attr]) {
		   ignored = ignored && true
		} else {
		   this.ignore[attr] = true
		   ignored = false
		}
	    }, this);

	    return ignored
	},

	isIgnored: function(attrs) {
	    if (typeof attrs == 'string') {
	        attrs = [attrs];    
	    }

	    var ignored = true;
            _.each(attrs, function(attr) { 
	        if (this.ignore[attr]) {
		   ignored = ignored && true
		} else {
		   ignored = false
		}
	    }, this);

	    return ignored
	},
	// reverse of ignore method
	include: function(attrs) {
	    if (typeof attrs == 'undefined') {
                attrs = this.attributes
	    }
	    if (typeof attrs == 'string') {
	        attrs = [attrs];    
	    }
            _.each(attrs, function(attr) { 
	        if (this.ignore[attr]) {
		   this.ignore[attr] = null
		} 
	    }, this);
	}

    });

    var TopicForm = Form.extend({
        
	initialize: function() {
	    _.bindAll(this, "load", "getType");	    
            this.load(Topic).ignore(["subtopics","resources"]);
	},

	renderOpts: {
	    "className"     : "topic",
	    "number"        : "input:number",	
	    "description"   : "textarea",
	    "name"          : "input",
	    "customize"     : "features",
	    "format"        : "table"
	},

    });

    var ResourceForm = Form.extend({
        
	initialize: function() {
	    _.bindAll(this, "load", "getType");	    
            this.load(Resource).ignore("topic_id");
	},

	renderOpts: {
	    "className"     : "topic",
	    "number"        : "input:number",	
	    "string"        : "input",	
	    "note"          : "textarea",
	    "title"         : "input",
	    "customize"     : "features",
	    "format"        : "table"
	},

    });


/* Application Classes */

    var User = function(email) {
        this.email = email;
    };

    User.prototype = {
        admin : function() {
	    return window.user_is_admin	
	}
    };

    var AdminMethods = function() {
        
    };

    AdminMethods.prototype = {
      
	hi: function() {
	    // to check the this keyword working of not
	    console.log("You got me:", this);	
	},

        currTgt: null,

	del: function(models, url) {
	     
	}, 

        // events related
        bindAllEvents: function() {
	    _.bindAll(this, "pinTopic", 
		            "parentLookup", 
			    "makeAndSave", 
			    "loadResourcesOf", 
			    "getRoot", 
			    "globalControl");
	    __.dispatcher.bind(global.EVENTS.TOPICPINNED, this.pinTopic);      
	    __.dispatcher.bind(global.EVENTS.GETPARENT, this.parentLookup);      
	    __.dispatcher.bind(global.EVENTS.SAVE, this.makeAndSave);      
	    __.dispatcher.bind(global.EVENTS.CONTROL, this.globalControl);      
	    __.dispatcher.bind(global.EVENTS.GOTO, this.redirect);      
	    __.dispatcher.bind(global.EVENTS.BOOKMARKVIEW, this.switchview);      
	},

	pinTopic: function(e){
	    this.currTgt = e;    	  
	},

	parentLookup: function(e) {
	    e.findParent(this.currTgt);
	},

	makeAndSave: function(e, btn){
	    if (e.model._Model ==  Topic) {
	        var url = this.urls.new_topic
	    } else if (e.model._Model == Resource) {
	        var url = this.urls.new_resource
	    } else {
	        return "Invaid Save Request." 
	    }
	    var obj = e.collect();
	    btn.btn.enabled = false;
	    var _parent = e.findParent();
	    if (! _parent ){
		if (url == this.urls.new_topic) {
	            url = this.urls.new_subject;
		} else {
		    btn.btn.enabled = true;
                    return "Resource needs a parent." 		
		}
		delete obj.parent_id
	    } 
            e.clearForm();
	    $.getJSON(url, obj, function(res) {
	        if (res.status == "success"){
		    obj.id = res.response.subject_id || res.response.topic_id || res.response.resource_id
		    e.makeModel(obj);
		} else if (res.status == 'forbidden') {
	            admin.msg("Access Denied.");	    
		} else {
		    console.log(res);
		}
		btn.btn.enabled = true;
	    }); 
	    // e.makeModel(obj);
	},

	delete: function(e, v) {
	    if (e instanceof Topic) {
	        var call_back = function(res) {
		    if (res.response.deleted == e.id){
			location.reload();
		    }
		} 
	    } else if (e instanceof Resource) {
	        var call_back = function(res) {
		    if (res.status == "success") {
			if (res.response.deleted == e.id){
			    var topic = AllTopics.get(e.get("topic_id"));
			    var rid = topic.get("resources").indexOf(e);
			    if (rid > -1) {
				topic.get("resources").splice(rid, 1)
			    }
			    if (v instanceof ResourceView) {
				v.clear();
			    }
			    e.destroy()
			}
		    } else if (res.status == 'forbidden') {
	                admin.msg("Access Denied.");	
		    } else {
		        console.log(res);
		    }
		} 
	    } else {
	        return 
	    }	
	    console.log(e);
	    var data = "obj_id=" + e.id;
	    $.getJSON(this.urls.delete, data, call_back);
	},

	update: function(data) {
	    $.getJSON(this.urls.update, data, function(res) {
	        if (res.status == "success") {
		   if (res.response.type="Resource") {
		       var r = Incoming.resources.get(res.response.updated);
		       var t = AllTopics.get(r.get("topic_id"));
		       t.addChildren(r);
		       t.trigger("resourcesadded", r, t);
		   } 
		} else {
		
		}    
	    });        	
	}

    };
    
    var Admin = function( user ) {
        
	this.user = user;
        
	if (user.admin()) {
	    _.extend(this, AdminMethods.prototype);
	    this.bindAllEvents();
	} else {
            for (m in AdminMethods.prototype) {
	        this[m] = function() { 
		    console.log("You do not own me");    
		    admin.msg("You are not admin.");
		    return false 
		}
	    }
	    __.dispatcher.bind(global.EVENTS.CONTROL, this.globalControl);      
	    __.dispatcher.bind(global.EVENTS.GOTO, this.redirect);      
	    __.dispatcher.bind(global.EVENTS.BOOKMARKVIEW, this.switchview);      
	}

    };
    // non-admin methods 
    Admin.prototype = {

        urls : {
	         "root"           : "/api/get_topic_tree",
		 "new_topic"      : "/api/create_topic", 
		 "new_subject"    : "/api/create_subject", 
		 "new_resource"   : "/api/create_resource", 
		 "load_resources" : "/api/load_resources", 
		 "load_bookmarks" : "/api/load_bookmarks", 
		 "update"         : "/api/update", 
		 "delete"         : "/api/delete",        
	},

        


	getRoot: function() {
	    window.AllTopics = AllTopics || new TopicList;
	    window.Gallery  = Gallery || new ResourceListView;
	    window.NoteArea = NoteArea || new ResourceNoteView;
	    window.TopicArea = TopicArea || new TopicListView;
	    window.topicForm = topicForm || new TopicForm();
	    window.resourceForm = resourceForm || new ResourceForm();
	    window.topicFormView = topicFormView || new TopicFormView({  model:topicForm  });
	    window.resourceFormView = resourceFormView || new ResourceFormView({  model:resourceForm });
	    $(global.container).hide();
	    this.msg("Loading...");
	    var self = this;
	    $.getJSON(this.urls.root, function(data){
		if (data.status == "success") {
		    if (window.root && AllTopics) {
		    // this api call is an update 
		        AllTopics.each(function(topic) {
			    topic.destroy();
			});
		    }
		    window.root = new Topic(data.response);
		    root.attachSubtopics();
            _.each(root.get("subtopics"), function(topic) {
                try{
                    TopicArea.topics.add(topic, {silent:true});
                    TopicArea.topics.trigger("include", topic);
                } catch (err) {
                    console.log(err);
                    console.log("TOPIC-AREA:", TopicArea.topics);
                }
            });
            self.loadResourcesOf(data.response.subtopics);
		} else {
		    window.root = root || new Topic(
			{"description":"","name":"ROOT","subtopics":[]}    
		    ); 
		}
		window.TopicBrowser = new TopicBrowseView({ model: root });
		topicFormView.render();
		resourceFormView.render();
		$(global.container).show();
		self.msg("Ready.", "off");
            });
	 
	}, 

	loadBookmarks: function() {
	    var self = this;
	    this.msg("Loading bookmarks...");
            $.getJSON(this.urls.load_bookmarks, function(data){
		if (data.status == "success") {
                    _.each(data.response.bookmarks, function(resource){
		        var r = new Resource(resource);
			Incoming.resources.add(r);
		    }, this);
	            self.msg("Done.", "off");
		} else {
	            self.msg("Failed loading bookmarks");
		}
            });
	},

	loadResourcesOf: function(topics) {
	    if ( !(topics instanceof Array) ) {
	        topics = [topics]
	    }

	    var extractID = function(model) {
	        return model.id || null
	    };
	    var ids = _.map(topics, extractID);
	    var data = "topic_ids="+ids.join("&topic_ids="); 
            var self = this;
	    self.msg("loading resources...");
	    $.getJSON(this.urls.load_resources,data, function(res) {
	        if (res.status == "success") {
		    self.matchResources(res.response.resources); 
		} else {
		    return "Failed to load resources"
		}
		self.msg("Done.", "off");
	    });
		      
	}, 

	matchResources: function(resources) {
	    if (!AllTopics) {
	        return 
	    }
	    if ( !(resources instanceof Array) ) {
	        resources = [resources];
	    }    		
	    var topic_id, topic, resource_model, r, rids;
	    _.each(resources, function(resource) {
		resource_model = resource instanceof Resource ? resource : (new Resource(resource) || null) 
		topic_id = resource.topic_id || null;
		topic = AllTopics.get(topic_id) || null;
		if (topic && resource_model) {
		    r = topic.get("resources");
		    rids = _.map(r, function(e){return e.cid || null});
		    if ( rids.indexOf(resource_model.cid) == -1 ) {
		        topic.addChildren(resource_model);
		        topic.trigger("resourcesadded", resource_model, topic);
		    }
		}
	    }, this);
	}, 

	msg: function(msg, off) {
	    msg = msg || "_"
	    
	    if (off) {
	        $(global.msg).html(msg).fadeOut("slow");
            } else {
	        $(global.msg).html(msg).show();
	    }
	},
	
	globalControl: function(e) {
	    $(e).toggle(400, function(){
            window.TopicBrowser.update();
        });
	}, 

	redirect: function(url) {
	    window.open(url, "_self"); 
	}, 

	switchview: function() {
	    $(global.container_resources).toggleClass("hide");	    
	    $(global.container_incoming).toggleClass("hide");	    
	}


    };

   

/* Backbone Views */
    var MenuView = Backbone.View.extend({
    // implemented for resource view only       
        el: "#menu", 

	initialize: function() {
	    _.bindAll(this, "display");
	    this.bind(global.EVENTS.RIGHTMENU, this.display);
	    this.who = null;
	}, 

	events: {
	    "click button": "onClickHandler"	
	},

	display: function(e, view) {
	    $(this.el).css({
		left: (e.pageX + "px"),
	        top: (e.pageY + "px")
	    }).show();
	    this.who = view;
	}, 

	onClickHandler: function(e) {
	    var act = $(e.target).attr("name");		
	    var self = this[act](e) || null;
	    if (self){
	        $(self.el).hide();
	    }
	}, 

	describe: function(e) {
	    this.who.shownote(e);	  
	    return this
	}, 
        
	remove: function(e) {
	    this.who.clear(e);
	    return this
	},

	open: function(e){
	    window.open(this.who.model.get("link")); 
	    return this
	},

	del: function(e) {
            admin.delete(this.who.model, this.who);	     
	    return this
	}


    });
    var BtnView = Backbone.View.extend({
        
	tagName: "button",

	className: "btn",
	
        initialize: function() {
	    this.btn = new Btn;
	    this.args = this.btn;
	},

	events: {
	    "click" : "clicked",
	},

	render: function() {
            $(this.el).html(this.btn.get("text"));	
	    return this
	}, 

	clicked: function(e) {

	    e.preventDefault();
	    e.stopPropagation();
	    if (this.btn["enabled"]) {
	        this.trigger(this.btn.get("event"), this.args, this);	
	    }
	}
    });
    var ResourceView = Backbone.View.extend({
        
        className: global.class_resource,

        template: _.template($(global.template_resource).html()),

	initialize: function() {
            this.render();
	},

	events : {
	    "contextmenu .icon" : "showmenu",
	    "click .icon" : "shownote",
	    "click .close": "clear",
	    "mouseover"   : "showicons",
	    "mouseout"    : "hideicons",
	},

	render: function() {
            $(this.el).html(this.template(this.model.toJSON()));	
	    return this
	},

	toggleHighlight: function() {
	    this.$(".title a").toggleClass('highlight');
	},

	shownote: function(e) {
	    e.stopPropagation();
	    e.preventDefault();
	    NoteArea.model = this.model;
	    $(NoteArea.render().el).show();
	},

	showmenu: function(e) {
	    e.stopPropagation();
	    e.preventDefault();
            menu.trigger(global.EVENTS.RIGHTMENU, e, this); 
	}, 

	showicons : function(e){
	    this.$(".circle").removeClass("hide");	    
	},

	hideicons: function(e){
	    this.$(".circle").addClass("hide");	    
	},

	clear: function(e) {
	    Gallery.resources.remove( this.model );
	}


    });

    var ResourceEditView = ResourceView.extend({

	tagName: "tr",

	className: global.class_resource_edit,

	initialize: function() {
	    _.bindAll(this, "findParent");
            this.parent_model = null;
	},

    events : {
	    "mouseover"   : "showicons",
	    "mouseout"    : "hideicons",
	    "click .btn"  : "actions"
	},


	template: _.template($(global.template_resource_edit).html()),

	render: function() {
            $(this.el).html(this.template(this.model.toJSON()));	
	    return this
	},

	actions: function(e) {
	    e.stopPropagation();
	    e.preventDefault();
	    var act = $(e.target).attr("name");
	    this[act].call(this);
	}, 

	edit: function() {
	    if (admin.user.admin()) {
	        this.$('.menu').toggleClass("hide");    
		this.$('.editable').attr("disabled", false).removeClass("hide");
		$(this.el).height(150);
	    } else {
	        admin.msg("You are not admin.");
	    }
	}, 

	save: function() {
	    if (admin.user.admin()) {
	        this.$('.menu').toggleClass("hide");    
		this.$('.editable').attr("disabled", "true");
		this.$('[name="type"]').addClass("hide");
		this.$('[name="link"]').addClass("hide");
		$(this.el).height(60);
		this.model.set({"type":this.$('[name="type"]').attr("value")});
		this.model.set({"link":this.$('[name="link"]').attr("value")});
		this.model.set({"title":this.$('[name="title"]').attr("value")});
		this.model.set({"note":this.$('[name="note"]').attr("value")});
		this.model.set({"topic_id":this.findParent()});
		var obj = this.model.toJSON();
		delete obj.dtitle;
		obj.obj_id = this.model.id;

		admin.update(obj);
	    } else {
	        admin.msg("You are not admin.");
	    }
	}, 

	del: function() {
	    this.clear();
            admin.delete(this.model, this);
	}, 

	getparent: function() {
	    this.trigger(global.EVENTS.GETPARENT, this);	   
	},

	findParent: function(e) {
	   if (!e) {
	       return this.model.get("topic_id") || null 
	   }
	   
	   this.parent_model = e;
	   this.model.set({"topic_id":e.id});
           this.$('.parent').html(e.get("name")).attr("id", e.id);	   	    
	   return this
	}, 

	clear: function(e) {
	    Incoming.resources.remove( this.model );
	}
        
    });

    var ResourceNoteView = Backbone.View.extend({
        
        el: global.container_panel_mid,

        template: _.template($(global.template_resource_note).html()),

	initialize: function() {
	    this.model = new Resource;
	},

	events : {
	    // "focusout" : "hide",
	    // "click .view"  : "open",
	},

	render: function() {
            $(this.el).html(this.template(this.model.toJSON()));	
	    return this
	},

	hide: function(){

	}

    });

    var ResourceListView = Backbone.View.extend({
        
        el : global.container_resources,

        initialize: function() {
	    this.resources = new ResourceList;
	    this.resourceViews = {};
	    _.bindAll(this, "addMore", "del");
	    this.resources.bind("add", this.addMore);
	    this.resources.bind("remove", this.del);
	},

	render: function() {
	    $(this.el).empty();
	    var c = this;
	    this.resources.each(function(resource){
	        var rv = c.resourceViews[resource.cid];
		$(c.el).append(rv.render().el);
	    });
	    
	    return this
	},

	addMore: function( resource ) {
	    var rv = this.resourceViews[resource.cid];
	    if (!rv){
		var rv = new ResourceView({ model: resource });
		this.resourceViews[resource.cid] = rv;
	    }
	    $(this.el).append(rv.render().el);
	},

	del: function( resource ) {
	    this.resourceViews[resource.cid].remove();
	    delete this.resourceViews[resource.cid];
	}
    });

    var IncomingListView = ResourceListView.extend({
        el : global.container_bookmarks, 

	addMore: function( resource ) {
	    var rv = this.resourceViews[resource.cid];
	    if (!rv){
		var rv = new ResourceEditView({ model: resource });
		this.resourceViews[resource.cid] = rv;
	    }
	    $(this.el).append(rv.render().el);
	}

    });

    var TopicView = Backbone.View.extend({
/* When this view is initiated, its model should already 
 * has resources attached to it. Also Clearing the view will 
 * not have effects on the model in the background */

	className : global.class_topic,

        template: _.template($(global.template_topic).html()),

	initialize: function() {
            if (this.model.hasResourcesAttached()) {
	        Gallery.resources.add(this.model.get("resources"));
	    } 
	    _.bindAll(this, "onResourcesAdded", "clear");
	    this.model.bind("resourcesadded", this.onResourcesAdded);
	},

	onResourcesAdded: function(r) {
	    Gallery.resources.add(r);
	    this.render();
	}, 

	events: {
            "click "        : "hlResources",
            "click .close"  : "clear"
	},

	render: function () {
            $(this.el).html(this.template(this.model.simpleJSON(1)));	
	    this.delegateEvents(this.events);
	    return this
	},

	hlResources: function() {
           if (this.model.hasResourcesAttached()) {
	       _.each(this.model.get("resources"), function( resource ){
		   try {
	               Gallery.resourceViews[resource.cid].toggleHighlight();
		   } catch (err) {
		        
		   }
	       }, this);
	   } 
	   $(this.el).toggleClass('highlight');
	   $(global.container_topic_desc).empty().html(this.model.get("description"));
	},

	clear: function(e) {
	   e.stopPropagation();
           e.preventDefault();
	   this.model.unbind("resourcesadded", this.onResourcesAdded);
           if (this.model.hasResourcesAttached()) {
	       Gallery.resources.remove(this.model.get("resources"))
	   } 
	   TopicArea.topics.remove(this.model);
	   $(this.el).remove();
	}

    });

    var TopicBrowseView = TopicView.extend({

        el: global.container_panel_big,

	className : global.class_topic,

	initialize: function() {
	    _.bindAll(this, "update");
	    this.model.bind("change", this.update);
        this.update();	
	    // this.bind(global.EVENTS.TOPICPINNED, );
	},
	
	labels : {
	    "check"  :  "icon-check",
	    "uncheck":  "nothing",
	    "fold"   :  "icon-folder-open",
	    "unfold" :  "icon-folder-close",
	    "pin"    :  "icon-pushpin"
	},

	events: {
		    "click span"   : "toggleSubtopics",	
		    "click .close" : "hide",	
		  "click .refresh" : "update",	
		    "click a"      : "easySelect",	
	 "click button.round"      : "tabview",	
		    "mousedown a"  : "pin",	
		    "click .done"  : "done"	
	},

	update: function() {
        this.modelObj = this.model.all_toJSON();	
	    this.render();
	},

	// takes a json string, returns a nested html structure
	render: function () {
        var html, tree, node; 
	    html = JSON.stringify( this.modelObj );
	    html = html.replace(/(,*){"cid":/g, '<li><a href="#" id=');
	    html = html.replace(/,"name":"/g, '>');
	    html = html.replace(/}/g, '</li>');
	    html = html.replace(/","subtopics":\[/g , '</a><ul class="topic">');
	    html = html.replace(/\]/g, '</ul>');
	    html = html.replace(/\<ul class="topic"\>\<\/ul\>/g, '');
	    tree = $(html);
	    tree.find('a').addClass(this.labels.uncheck);
	    node = '<span class="' + this.labels.fold + '"></span>';
	    tree.find('ul').parent().prepend(node);
	    $(global.container_topic_tree).empty();
            tree.appendTo(global.container_topic_tree);
	    $(this.el).height(tree.height()+100);
	    if (admin.user.admin() && !this.toggleBtnDrawn) {
            this.toggleBtnDrawn = true;
	        var bt_hide = new BtnView({ className: "btn round icon-chevron-left"});    
		    bt_hide.args = this;
		    bt_hide.btn.set({
		       "text"    :"",
		       "event"   :"togglepanel" 
		    });
            this.$(".control").append(bt_hide.render().el);
            __.dispatcher.bind("togglepanel", function(v, btn) {
                $(btn.el).toggleClass("icon-chevron-right").toggleClass("icon-chevron-left");
                $(v.el).toggleClass("full");
            });
	    }
	},

	hide: function() {
	    $(this.el).fadeOut('fast');      
	},

	showAll: function() {
	    this.$('hide').removeClass('hide');	 
	    this.$(this.labels.unfold).removeClass(this.labels.unfold).addClass(this.labels.fold);	 
	},

	toggleSubtopics: function(e) {
	    $(e.target).parent().find("ul").toggleClass("hide");		 
	    $(e.target).toggleClass(this.labels.fold).toggleClass(this.labels.unfold);		 
	},

	done: function() {
	    this.hide();
	    var topic, filter, topics;
	    filter = "."+this.labels.check;
	    topics = [];
	    this.$(filter).each(function() {
	        topic =AllTopics.getByCid(  $(this).attr("id") );
	        previous =TopicArea.topics.getByCid(  $(this).attr("id") );
		if ( !(topic.get("name") == "ROOT" || previous) ) {
		    try{
			TopicArea.topics.add(topic, {silent:true});
			TopicArea.topics.trigger("include", topic);
			if (!topic.hasResourcesAttached()) {
			    topics.push(topic);
			}
		    } catch (err) {
			console.log(err);
			console.log("TOPIC-AREA:", TopicArea.topics);
		    }
		}
	    }); 

	    return topics.length==0 || admin.loadResourcesOf(topics);
	},

	easySelect: function(e) {
	    e.stopPropagation();
            e.preventDefault();
	    if ($(e.target).hasClass(this.labels.check)){
	        $(e.target).removeClass(this.labels.check);
	        $(e.target).addClass(this.labels.uncheck);
		return
	    } else {
	        $(e.target).parent().find("a").removeClass(this.labels.uncheck);
	        $(e.target).parent().find("a").addClass(this.labels.check);
	    }	    
	},

	pin: function(e){
	    e.stopPropagation();
            e.preventDefault();
	    this.$('a').removeClass(this.labels.pin);
	    if ($(e.target).hasClass(this.labels.uncheck)) {
	       $(e.target).addClass(this.labels.pin);
	    }
	    var topic =AllTopics.getByCid(  $(e.target).attr("id") );
	    var desc = "<p><i>"+topic.get("name")+"</i></p>" + 
		     "<p>"+topic.get("description")+"</p>";
	    $(global.container_topic_info).html(desc);
	    this.trigger("topicpinned", topic);
	},

	tabview: function(e){
		 
	    e.stopPropagation();
            e.preventDefault();
            if ($(e.target).attr("id") == "tab-topic") {
	        $(global.container_topic_mgt).parent().show();
	        $(global.container_resource_mgt).parent().hide();
	    } else {
	        $(global.container_topic_mgt).parent().hide();
	        $(global.container_resource_mgt).parent().show();
	    }
	}
    
    });

    var TopicListView = Backbone.View.extend({
        
        el: global.container_topics,

	initialize: function (){
	    this.topics = new TopicList;
	    _.bindAll(this, "addMore");
	    this.topics.bind("include", this.addMore);
	    // the container of this thing
	},

	render: function() {
		
	},

	events: {

	},

	addMore: function( topic ) {
	    if (typeof topic.get("isIncludedAs") == 'undefined') { 
	        var topicView = new TopicView({ model: topic });
	        topic.set({"isIncludedAs": topicView});
	    } else {
	        var topicView = topic.get("isIncludedAs");
	    }
	    $(this.el).append(topicView.render().el);
	    return this
	},



    });

    var AdminView = Backbone.View.extend({
    

	initialize: function() {
	    if ( admin.user.admin() ) {
	        // $(global.container_panel_big).css({right: 0});    
	    }	    

	    this._bt1 = new BtnView({ className: 'btn icon-cog' });
	    this._bt1.args = global.container_panel_big;
	    this._bt1.btn.set({
	        "text" : "Browse Topics",
		"event": global.EVENTS.CONTROL
	    });
	    this._bt2 = new BtnView({ className: 'btn icon-user' });
            this._bt2.args = window.login_url;
	    var login_text = window.user_is_admin ? user.email : "Login (No Sign-up Offered)"; 
	    this._bt2.btn.set({
	        "text" : login_text,
		"event": global.EVENTS.GOTO
	    });
	    this._bt3 = new BtnView({ className: 'btn icon-github-sign' });
            this._bt3.args = "https://github.com/yiransheng/learningcurve";
	    this._bt3.btn.set({
	        "text" : "See it on Github",
		"event": global.EVENTS.GOTO
	    });
            this._bt4 = new BtnView({ className: 'btn icon-th-list' });
	    this._bt4.btn.set({
	        "text" : "Bookmarks / Resources",
		"event": global.EVENTS.BOOKMARKVIEW
	    });

	},

        events: {
		
	},

	render: function() {
            $(this.el).append(this._bt3.render().el);	
            $(this.el).append(this._bt2.render().el);	
            $(this.el).append(this._bt4.render().el);	
            $(this.el).append(this._bt1.render().el);	
	}
    
    });


    var FormView = Backbone.View.extend({
        
	initialize: function(e) {
	    _.bindAll(this, "table");
	    // inherit rendering options from the model supplied
	    if (e.renderOpts) {
		_.extend(this.model.renderOpts, e.renderOpts)
	    }

	    this.renderOpts = this.model.renderOpts;
	},
        
	events: {
		
	},

	render: function() {
	    var render_by_format = this[this.renderOpts["format"]];
	    if (!render_by_format){
		console.log("Format not supported in", this)
	        return this
	    }
            var html = render_by_format.call(this);	
	    $(this.el).html(html);
	    var _customize = this.renderOpts["customize"];
	    if (_customize) {
	        render_by_format = this[_customize] || function() { return "" }
	    } else {
	        return this
	    }

	    render_by_format.call(this); 
	    return this
	},

	table: function() {
	    var model, html, tag;
	    model = this.model;
	    html = ('<table class="');
	    html += (this.renderOpts.className);
	    html += ('"><tbody>');
	    for (attr in model.attributes) {
	        if (!model.isIgnored(attr)) {
		    html+=('<tr><td>');
	            html+=(attr);
		    html+=('</td><td>'); 
		    tag = this.renderOpts[attr] || this.renderOpts[this.model.get(attr)] || ""
		    tag = tag + ":::";
		    tag = tag.split(":");
		    tag = '<'+tag[0]+' type="'+tag[1]+'" class="'+tag[2]+'" name="' + attr +'" />';
		    html+=(tag);
		    html+=('</td></tr>');
		}
	    }       
	    html = html + "</tbody></table>";
	    // html = html.join("");
	    return html
	},

	collect: function() {
	    var attrs, result, value;
	    result = {};
	    attrs = this.model.attributes; 
	    for (attr in attrs) {
		if (!this.model.isIgnored(attr)){
	            value = this.$('[name="'+ attr +'"]').attr("value");
		    result[attr] = value.toString() || "";
		}
	    }
	    return result
	}, 

	clearForm : function() {
	    this.$("input").attr("value", "");	    
	    this.$("textarea").attr("value", "");	    
	}

    });

    var TopicFormView = FormView.extend({
    
        initialize: function(e) {
	    _.bindAll(this, "table", "findParent");
	    if (e.renderOpts) {
		_.extend(this.model.renderOpts, e.renderOpts)
	    }

	    this.renderOpts = this.model.renderOpts;
	},
        
        events: {
		
	},	

	features: function() {
	   // this.$('table').hide('disabled', true);       
	   var _button; 
           _button = new BtnView({ className : 'btn icon-pushpin'});
	   _button.args = this;
	   _button.btn.set({
	       "event": global.EVENTS.GETPARENT, 
	       "text" : "Set Parent"
	   });
	   $(this.el).prepend('<div class="parent"> </div>');
	   $(this.el).prepend(_button.render().el);
           _button = new BtnView({ className : 'btn icon-file'});
	   _button.args = this;
	   _button.btn.set({
	       "event": global.EVENTS.SAVE, 
	       "text" : "Save"
	   });
	   $(this.el).prepend(_button.render().el);
           $(this.el).prepend("<h2>Create a new topic:</h2>");
	   $(global.container_topic_mgt).append(this.el);
	},

 
	findParent: function(e) {
	   if (!e) {
	       return this.parent_model.id || null 
	   }
	   
	   this.parent_model = e;
           this.$('.parent').html(e.get("name")).attr("id", e.id);	   	    
	   return this
	}, 

	collect: function() {
	   var result;  
	   result = FormView.prototype.collect.call(this);	 
	   result.parent_id = this.findParent(); 
	   return result
	}, 

	makeModel: function(obj){
	   delete obj.parent_id;
	   var m = new this.model._Model(obj);    	   
	   this.parent_model.addChildren(m);
	}
    });

    var ResourceFormView = TopicFormView.extend({

        features: function() {
	   var _button; 
           _button = new BtnView({ className : 'btn icon-pushpin'});
	   _button.args = this;
	   _button.btn.set({
	       "event": global.EVENTS.GETPARENT, 
	       "text" : "Set Parent"
	   });
	   $(this.el).prepend('<div class="parent"> </div>');
	   $(this.el).prepend(_button.render().el);
           _button = new BtnView({ className : 'btn icon-file'});
	   _button.args = this;
	   _button.btn.set({
	       "event": global.EVENTS.SAVE, 
	       "text" : "Save"
	   });
	   $(this.el).prepend(_button.render().el);
           $(this.el).prepend("<h2>Create a new resource:</h2>");
	   $(global.container_resource_mgt).append(this.el);
	}, 

	makeModel: function(obj) {
	   delete obj.parent_id;
	   var m = new this.model._Model(obj);    	   
	   this.parent_model.addChildren(m);
	   this.parent_model.trigger("resourcesadded", m, this.parent_model);
	}

    });

/* Run */
    console.log('Running..');
    $(global.container).hide();
    var user = new User(window.user_email);
    var admin = new Admin(user);
    var adminView = new AdminView({ el: global.container_admin });
    adminView.render();
    window.AllTopics = new TopicList;
    window.Gallery  = new ResourceListView;
    window.Incoming  = new IncomingListView;
    window.NoteArea = new ResourceNoteView;
    window.TopicArea = new TopicListView;
    window.topicForm = new TopicForm();
    window.resourceForm = new ResourceForm();
    window.topicFormView = new TopicFormView({  model:topicForm  });
    window.resourceFormView = new ResourceFormView({  model:resourceForm });
    window.menu = new MenuView;
    admin.getRoot();

    admin.loadBookmarks();

});
