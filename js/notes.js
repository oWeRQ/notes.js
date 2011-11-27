window.Note = Backbone.Model.extend({
	defaults: {
		title: '',
		body: '',
		deleted: 0,
		synced: 0,
		mtime: 0
	},
	sync: function(method, model, options){
		Backbone.serverSync(method, model, options);
		return Backbone.localSync(method, model, options);
	}
});

window.Notes = Backbone.Collection.extend({
	model: Note,
	localStorage: new Store("notes"),
	url: 'notes.php'
});

window.NoteView = Backbone.View.extend({
	app: null,
	tagName: 'li',
	events: {
		'click': 'edit'
	},
	initialize: function(opt){
		this.app = opt.app;
		this.model.bind('change', this.render, this);
		this.model.bind('destroy', this.remove, this);
	},
	edit: function(){
		this.app.form.model = this.model;
		this.app.form.render();
	},
	render: function(){
		$(this.el).text(this.model.get('title'));
		return this;
	}
});

window.NoteForm = Backbone.View.extend({
	app: null,
	model: null,
	events: {
		'submit': 'submit',
		'click .destroy': 'destroy',
	},
	initialize: function(opt){
		this.app = opt.app;
		this.model.bind('change', this.render, this);
		this.model.bind('destroy', this.clear, this);
	},
	submit: function(e){
		e.preventDefault();
		var data = {
			title: this.$('[name=title]').val(),
			body: this.$('[name=body]').val()
		};
		if (this.model.isNew())
			this.app.notes.create(data);
		else
			this.model.save(data);
	},
	destroy: function(){
		this.model.destroy();
		this.clear();
	},
	clear: function(){
		this.model = new Note;
		this.render();
	},
	render: function(){
		this.$('[name=title]').val(this.model.get('title'));
		this.$('[name=body]').val(this.model.get('body'));
		return this;
	}
});

window.NotesApp = Backbone.View.extend({
	events: {
		'click .create': 'create',
		'click .push': 'push',
		'click .pull': 'pull',
	},
	initialize: function(){
		this.list = this.$('#notesList');

		_.bindAll(this, 'online', 'offline');
		window.addEventListener('online', this.online);
		window.addEventListener('offline', this.offline);

		if (navigator.onLine)
			this.online();
		else
			this.offline();

		this.notes = new Notes;
		this.notes.bind('add', this.append, this);
		this.notes.bind('reset', this.render, this);
		this.notes.fetch();

		this.form = new NoteForm({
			app: this,
			el: this.$('#addNote'),
			model: new Note
		});
	},
	online: function(){
		this.$('#status').html('online');
	},
	offline: function(){
		this.$('#status').html('offline');
	},
	create: function(e){
		e.preventDefault();
		this.form.model = new Note;
		this.form.render();
	},
	push: function(e){
		e.preventDefault();
	},
	pull: function(e){
		e.preventDefault();
	},
	append: function(item){
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
