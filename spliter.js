//AUTHOR:  Maksim Ryzhikov
//NAME:    misc-spliter
//VERSION  0.2
var app = dactyl.plugins.app;

var spliter;

//SPLITER {{{
var SpliterCmd = function (id) {
	var container = app.create("hbox", {
		"class": "dactyl-container",
		hidden: false,
		collapsed: true,
		highlight: "Normal CmdNormal"
	},
	app.byId('dactyl-container'));
	var label = app.create("label", {
		"class": "dactyl-commandline-prompt plain",
		flex: 0,
		crop: "end",
		value: "$»",
		highlight: "Normal CmdNormal"
	},
	container);
	var textbox = app.create("textbox", {
		id: id,
		"class": "dactyl-commandline-command plain",
		type: "autocomplete",
		autocompletesearch: "history",
		showcommentcolumn: "true",
		tabscrolling: "true",
		flex: 1,
		timeout: 10,
		focused: true,
		collapsed: false
	},
	container);
	textbox.addEventListener('blur', app.hitch(this, function (evt) {
		container.collapsed = true;
    textbox.value = "";
	}), true);

	this.id = id;
	this.container = container;
	this.label = label;
	this.textbox = textbox;
};
//}}}
var Frame = function (url, opts) {
	return app.create("frame", {
		builder: window.content.document,
		src: url,
		width: "100%",
		height: 500
	});
};

var Spliter = function(doc){
  this.doc = doc;
  this.frames = [];

  this.initialize = function(){
    var doc = this.doc, frames = this.frames;
    var href = doc.location.href;
    /*reset current page and insert her content in frame*/
    doc.body.innerHTML = "";
    this.container = app.create("frameset", {
      builder: doc
    }, doc.body);
    var frame = new Frame(href);
    frames.push({node:frame,uri: href,index:frames.length});
    app.place(frame,this.container);
    frame.contentWindow.location.href = href;
  };
};
var _proto = {
  split: function(url){
		var ct = this.container;
		var fs = this.frames;
		var frame = new Frame(url);
		app.place(frame, ct);
		fs.push({node:frame,uri: url,index:fs.length});
		ct.cols = app.multi("*", fs.length).split('').join(',');
  },
  toggleFrame: function(uri){
    var frame = app.filter(this.frames,function(f){ return f.uri == uri;},this)[0];
    if (frame.node){
       var cols = this.container.cols.split(',');
       cols[frame.index] = (cols[frame.index] === "0")? "*": 0;
       this.container.cols = cols.join(',');
    }
  },
  _completer: function(){
    var compl = [];
    app.forEach(this.frames,function(item){
        compl.push(item.uri);
    },this);
    return compl;
  }
};
Spliter.prototype = _proto;
Spliter.prototype.constructor = Spliter;

var controller = {
	tabs: [],
  currentTab: null,
	connect: function (node, evt) {
		node.addEventListener(evt, app.hitch(this, "_doSplit"), true);
    return true;
	},
	_doSplit: function (evt) {
    this.currentTab = window.content.document;
		var url = evt.originalTarget.value;
    this.actions(this.currentTab,url);
	},
  _filterTab: function(doc){
    return app.filter(this.tabs,function(t){
        return t.doc == doc;
    },this)[0];
  },
  actions: function(doc,url,action){
    var tabs = this.tabs;
    var tab = this._filterTab(doc);
    if (!tab && !action){
      tab = new Spliter(doc);
      tab.initialize();
      tabs.push(tab);
      tab.split(url);
    }else if (tab && !action){
      tab.split(url);
    }else if (tab && action){
      tab.toggleFrame(url);
    }
  },
  _completer: function(context){
    /*return uri frames on current page*/
    var compl, doc = window.content.document, tab = controller._filterTab(doc);
    if(tab){
      compl = tab._completer();
      context.completions = [[c, ''] for each (c in compl)];
    }
  }
};

commands.add(["spl[it]"], "Split Window", function (args) {
  if (!spliter){
    spliter = new SpliterCmd('spliter-id');
    controller.connect(spliter.textbox,'change');
  }
	spliter.container.collapsed = false;
	spliter.textbox.focus();
});
commands.add(["tur[n]"], "Toggle Minimazed/Maximaze Split Window", function (args) {
    var doc = window.content.document;
    controller.actions(doc,args,true);
},
{
   count: true, argCount: 1, completer: controller._completer }
);
// vim: set fdm=marker sw=2 ts=2 sts=2 et:
