//AUTHOR:  Maksim Ryzhikov
//NAME:    splitter (Spider)
//VERSION  1.1b
var app = dactyl.plugins.app;

/*
 *Frame constructor function
 */
var Frame = function (url, opts) {
	//mixining options for frame
	var options = app.mixin({
		builder: window.content.document,
		src: url,
		width: "100%",
		height: "100%"
	},
	opts || {});
	return app.create("frame", options); //return node frame
};

/*
 * Spider is controling behavior tab
 * Spider is 'Divided Tab'
 */
var Spider = function (doc) {
	this.doc = doc;
	this.frames = [];
	this.afterFilter = function (frame, url) {
		var frames = this.frames;
		frames.push({
			node: frame,
			uri: url,
			index: frames.length
		});
		return frames;
	};
	this.reindex = function () {
		app.forEach(this.frames, function (f, i) {
			f.node.name = "split" + i;
			f.index = i;
		},
		this);
	};
	this.initialize = function () {
		var doc = this.doc;
		var url = doc.location.href; //save link on current page
		this.container = app.create("frameset", {
			builder: doc
		});
		var html = doc.body.parentNode;
		html.replaceChild(this.container, doc.body); //replace body on frameset
		this.split(url).contentWindow.location.href = url; //insert link on current page in frame (hack)
	};
};

var _proto_ = {
	constructor: Spider,
	split: function (url) {
		var ct = this.container; //container frameset
		var frame = new Frame(url, {
			name: "split" + this.frames.length
		});
		app.place(frame, ct);
		var fs = this.afterFilter(frame, url); //frames
		ct.cols = app.multi("*", fs.length).split('').join(',');
		return frame;
	},
	close: function (uri) {
		var frames = this.frames;
		var frame = app.filter(frames, function (f) {
			return f.uri == uri;
		},
		this)[0];
		if (frame.node) {
			var cols = this.container.cols.split(',');
			var delNode = this.container.removeChild(frame.node);
			cols.splice(frame.index, 1);
			frames.splice(frame.index, 1);
			this.container.cols = cols.join(',');
			this.reindex();
		}
	},
	toggle: function (uri) {
		var frame = app.filter(this.frames, function (f) {
			return f.uri == uri;
		},
		this)[0];
		if (frame.node) {
			var cols = this.container.cols.split(',');
			cols[frame.index] = (cols[frame.index] === "0") ? "*": 0;
			this.container.cols = cols.join(',');
		}
	},
	completer: function () {
		var compl = [];
		app.forEach(this.frames, function (item) {
			compl.push(item.uri);
		},
		this);
		return compl;
	}
};
Spider.prototype = _proto_;

/*
 * Controller is controling all Spiders(Tabs)
 */
var controller = {
	tabs: [],
	currentTab: null,
	beforeFilter: function (doc) {
		return app.filter(this.tabs, function (t) {
			return t.doc == doc;
		},
		this)[0];
	},
	doSetup: function (doc, url) {
		var tab = new Spider(doc);
		tab.initialize();
		this.tabs.push(tab);
		tab.split(url);
	},
	doSplit: function (url, tab) {
		tab.split(url);
	},
	doClose: function (url, tab) {
		tab.close(url);
	},
	doToggle: function (url, tab) {
		tab.toggle(url);
	},
	doPull: function (url, doc) {
		this.doSplit(url, doc);
	},
	actions: function (url, action, doc) { //actions with windows in current page
		var doct = doc || window.content.document; //initialize current document
		var tab = this.beforeFilter(doct); //before filter
		if (!tab) {
			return this.doSetup(doct, url);
		}
		/*
		 * switch actions
		 */
		switch (action) {
		case "-split":
			this.doSplit(url, tab);
			break;
		case "-close":
			this.doClose(url, tab);
			break;
		case "-turn":
			this.doToggle(url, tab);
			break;
		case "-pull":
			this.doPull(url, tab);
			break;
		default:
			this.doSplit(url, tab); //deprecated you must pass actions
		}
	},
	completer: function (context) {
		var compl, doc = window.content.document,
		tab = controller.beforeFilter(doc);
		if (tab) {
			compl = tab.completer();
			context.completions = [[c, ''] for each (c in compl)];
		}
	}
};

group.commands.add(["spid[er]"], "Split Window", function (args) {
	var option = app.filter(this.options, function (option) {
		var a = args[option.names[0]] || args[option.names[1]];
		return !! a;
	},
	this)[0];

	if (option) {
		var a = args[option.names[0]] || args[option.names[1]];
		controller.actions(a, option.names[0]);
	} else {
		controller.actions(args[0], "-split");
	}
},
{
	argCount: "?",
	completer: function (context, maxitems, sort) {
		completion.url(context);
	},
	options: [{
		names: ["-close", "-C"],
		description: "Close window",
		type: commands.OPTION_STRING,
		completer: function (context) {
			controller.completer(context);
		}
	},
	{
		names: ["-turn", "-T"],
		description: "Turn window",
		type: commands.OPTION_STRING,
		completer: function (context) {
			controller.completer(context);
		}
	},
	{
		names: ["-pull", "-P"],
		description: "Pull open tabs in current page",
		completer: function (context, args) {
			var mtabs = dactyl.modules.tabs;
			var tabs = mtabs.getGroups().AllTabs.tabs,
			compl = [];
			app.forEach(tabs, function (i, tab) {
				var label = tab.label;
				var url = tab.linkedBrowser._contentWindow.document.URL;
				compl.push([url, label]);
			},
			this);
			context.completions = [[url, title] for each ([url,title] in compl)];
		},
		type: commands.OPTION_STRING
	}]
});
