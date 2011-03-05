//AUTHOR:  Maksim Ryzhikov
//NAME:    misc-spliter
//VERSION  0.1
var app = dactyl.plugins.app;

var spliter;

//SPLITER {{{
var Spliter = function (id) {
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

var controller = {
	container: null,
	frames: [],
	connect: function (node, evt) {
		node.addEventListener(evt, app.hitch(this, "setWindow"), true);
    return true;
	},
	setWindow: function (evt) {
    this.body = window.content.document.body;
		var url = evt.originalTarget.value;
		this.checkHas();
		var ct = this.container;
		var fs = this.frames;
		var frame = new Frame(url);
		app.place(frame, ct);
		fs.push({node:frame,uri: url,index:fs.length});
		ct.cols = app.multi("*", fs.length).split('').join(',');
	},
	checkHas: function () {
		if (!this.container) {
      /*
       * Escape page and set content in frame
       */
      var href = window.content.document.location.href;
      this.currentPage = window.content.document;
      var curentHTML = this.body.innerHTML;
      this.frames = [];
      this.body.innerHTML = "";
			this.container = app.create("frameset", {
				builder: window.content.document
			},
			this.body);
      var current_page = new Frame(href);
      this.frames.push({node:current_page,uri: href,index:this.frames.length});
      app.place(current_page,this.container);
      current_page.contentWindow.location.href = href;
      return;
		} else if (!app.hasNode(this.container, this.body)) {
      this.currentPage.location.reload();
			this.clear();
      return;
		}
	},
	clear: function () {
		this.frames = [];
		delete this.container;
		this.checkHas();
	},
  closeWindow: function(uri){
    var frame = app.filter(this.frames,function(f){ return f.uri == uri;},this)[0];
    if (frame.node){
       var cols = this.container.cols.split(',');
       cols[frame.index] = 0;
       this.container.cols = cols.join(',');
    }
  },
  _completer: function(context){
    var compl = [];
    app.forEach(controller.frames,function(item){
        compl.push(item.uri);
    },this);
    context.completions = [[c, ''] for each (c in compl)];
  }
};

commands.add(["split[]"], "Split Window", function (args) {
  if (!spliter){
    spliter = new Spliter('spliter-id');
    controller.connect(spliter.textbox,'change');
  }
	spliter.container.collapsed = false;
	spliter.textbox.focus();
});
commands.add(["turn[]"], "Minimazed Split Window", function (args) {
    controller.closeWindow(args);
},
{
   //options: [[["-down"], commands.OPTION_STRING]],
   count: true, argCount: 1, completer: controller._completer }
);
// vim: set fdm=marker sw=2 ts=2 sts=2 et:
