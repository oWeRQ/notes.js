window.applicationCache.addEventListener('updateready', function(){
	window.applicationCache.swapCache();
	if (confirm('A new version is available. Load it?')) {
		window.location.reload();
	}
}, false);

window.applicationCache.update();

window.Note = Backbone.Model.extend({
	defaults: {
		title: '',
		body: '',
		deleted: 0,
		mtime: 0
	},
	updateMTime: function(){
		this.set({
			mtime: new Date().getTime()
		});
	},
	destroy: function(options){
		options || (options = {});

		if (!this.isNew()) {
			this.save({
				title: '',
				body: '',
				deleted: 1
			});
		}

		this.trigger('destroy', this, this.collection, options);

        if (!this.isNew() && options.success) {
        	options.success(this, this);
        }
	},
	sync: function(method, model, options){
		if (method != 'read')
			model.updateMTime();

		Backbone.localSync(method, model, options);
	}
});

window.Notes = Backbone.Collection.extend({
	model: Note,
	localStorage: new Store('notes'),
	url: 'notes.php',
	serverSync: function(){
		var collection = this;
		Backbone.serverSync('read', this, {
			success: function(resp, status, xhr) {
				var serverIds = _.pluck(resp, 'id');
				var localIds = _.pluck(collection.models, 'id');
				var notSyncIds = _.difference(localIds, serverIds);
				
				_.each(resp, function(server_note){
					var note = collection.get(server_note.id);
					if (note) {
						if (note.attributes.mtime == server_note.mtime) {
							//NOP
						} else if (note.attributes.mtime < server_note.mtime) {
							note.save(server_note);
						} else {
							notSyncIds.push(server_note.id);
						}
					} else {
						if (server_note.deleted == 0)
							collection.create(server_note);
					}
				});

				_.each(notSyncIds, function(id){
					var note = collection.get(id);
					Backbone.serverSync('update', note);
				});
			}
		});
	}
});

window.NoteView = Backbone.View.extend({
	app: null,
	tagName: 'li',
	template: _.template('<%=title?title:"<i>empty</i>"%> <span class="mtime"><%=mtime%></span>'),
	events: {
		'click': 'edit'
	},
	initialize: function(opt){
		this.app = opt.app;
		this.model.bind('change', this.render, this);
		this.model.bind('destroy', this.remove, this);
	},
	edit: function(){
		this.app.form.modify(this.model);
	},
	render: function(){
		$(this.el).html(this.template({
			title: this.model.get('title'),
			mtime: new XDate(this.model.get('mtime')).toString('d MMM, H:mm')
		}));
		return this;
	}
});

window.NoteForm = Backbone.View.extend({
	app: null,
	events: {
		'submit': 'submit',
		'click .delete': 'delete',
		'click .close': 'close',
	},
	initialize: function(opt){
		this.app = opt.app;
		this.title = this.$('[name=title]');
		this.body = this.$('[name=body]');
		this.model.bind('change', this.render, this);
		this.model.bind('destroy', this.close, this);
	},
	modify: function(item){
		this.model = item;
		this.render();
		this.el.show();
	},
	submit: function(e){
		e.preventDefault();

		this.model.set({
			title: this.title.val(),
			body: this.body.val()
		});

		if (this.model.isNew())
			this.app.notes.add(this.model);

		this.model.save();

		this.close();
	},
	delete: function(e){
		e.preventDefault();
		e.stopPropagation();
		if (confirm('Delete?'))
			this.model.destroy();
	},
	close: function(e){
		e && e.preventDefault();
		this.el.hide();
	},
	render: function(){
		this.title.val(this.model.get('title'));
		this.body.val(this.model.get('body'));
		return this;
	}
});

window.NotesApp = Backbone.View.extend({
	events: {
		'click .create': 'create',
		'click .sync': 'sync',
		'click .reset': 'reset',
	},
	initialize: function(){
		this.list = this.$('#notesList');

		this.notes = new Notes;
		this.notes.bind('add', this.append, this);
		this.notes.bind('reset', this.render, this);
		this.notes.fetch();

		_.bindAll(this, 'online', 'offline');
		window.addEventListener('online', this.online);
		window.addEventListener('offline', this.offline);

		if (navigator.onLine)
			this.online();
		else
			this.offline();

		this.form = new NoteForm({
			app: this,
			el: this.$('#addNote'),
			model: new Note
		});
	},
	online: function(){
		this.$('#status').attr('class', 'online').html('online');
		this.notes.serverSync();
	},
	offline: function(){
		this.$('#status').attr('class', 'offline').html('offline');
	},
	create: function(e){
		e.preventDefault();
		this.form.modify(new Note);
	},
	sync: function(e){
		e.preventDefault();
		this.notes.serverSync();
	},
	reset: function(e){
		e.preventDefault();
		console.log(localStorage['notes']);
		this.notes.localStorage.data = {};
		this.notes.localStorage.save();
		this.notes.fetch();
		console.log(localStorage['notes']);
	},
	append: function(item){
		if (item.get('deleted') == 1)
			return;
		
		var view = new NoteView({
			app: this,
			model: item
		});
		this.list.append(view.render().el);
	},
	render: function(){
		this.list.empty();

		this.notes.each(function(item){
			this.append(item);
		}, this);

		return this;
	}
});
