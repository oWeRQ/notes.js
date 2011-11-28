function time() {
	return Math.round(new Date().getTime() / 1000);
}

window.Note = Backbone.Model.extend({
	defaults: {
		title: '',
		body: '',
		deleted: 0,
		mtime: 0
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
		if (method != 'read') {
			model.set({
				mtime: time()
			});
		}

		if (navigator.onLine) {
			Backbone.localSync(method, model, {success: function(){}});
			Backbone.serverSync(method, model, options);
		} else
			Backbone.localSync(method, model, options);
	}
});

window.Notes = Backbone.Collection.extend({
	model: Note,
	localStorage: new Store('notes'),
	url: 'notes.php',
	sync: function(method, model, options){
		if (navigator.onLine) {
			var success = options.success;
			options.success = function(resp, status, xhr){
				success(resp, status, xhr);
				model.localStorage.update(resp);
			};
			Backbone.serverSync(method, model, options);
		} else
			Backbone.localSync(method, model, options);
	}
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
		this.app.form.modify(this.model);
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
		'click .close': 'close',
	},
	initialize: function(opt){
		this.app = opt.app;
		this.model.bind('change', this.render, this);
		this.model.bind('destroy', this.clear, this);
	},
	modify: function(item){
		this.model = item;
		this.render();
		this.el.show();
	},
	submit: function(e){
		e.preventDefault();

		this.model.set({
			title: this.$('[name=title]').val(),
			body: this.$('[name=body]').val()
		});

		if (this.model.isNew())
			this.app.notes.add(this.model);

		this.model.save();

		this.close();
	},
	destroy: function(e){
		e.preventDefault();
		e.stopPropagation();
		if (confirm('Delete?')) {
			this.model.destroy();
			this.close();
		}
	},
	close: function(e){
		e && e.preventDefault();
		this.el.hide();
	},
	render: function(){
		this.$('[name=title]').val(this.model.get('title'));
		this.$('[name=body]').val(this.model.get('body'));
		return this;
	}
});

window.NotesApp = Backbone.View.extend({
	offlineFrom: 0,
	events: {
		'click .create': 'create',
		'click .push': 'push',
		'click .pull': 'pull',
		'click .reset': 'reset',
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
		this.$('#status').attr('class', 'online').html('online');
		if (this.offlineFrom)
			this.push();
	},
	offline: function(){
		this.$('#status').attr('class', 'offline').html('offline');
		this.offlineFrom = time();
	},
	create: function(e){
		e.preventDefault();
		this.form.modify(new Note);
	},
	push: function(e){
		e && e.preventDefault();
		Backbone.serverSync('update', this.notes);
	},
	pull: function(e){
		e.preventDefault();
		this.notes.fetch();
	},
	reset: function(e){
		e.preventDefault();
		console.log(localStorage['notes']);
		this.notes.localStorage.data = {};
		this.notes.localStorage.save();
		console.log(localStorage['notes']);
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
			if (item.get('deleted') === 0)
				this.append(item);
		}, this);

		return this;
	}
});
