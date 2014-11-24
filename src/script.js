/** @jsx React.DOM */

// Global unique ID used for any objects that I create
// It's used for react to be able to make decisions based on a key prop
var uniqueIDMaker = (function() {
  var ID = 0;
  return {
    generateID: function(){
      return ID++;
    }
  };
})();

// Color Class is used as a wrapper around a div, and an eventhandler for click
// When you click on <Color /> it will call he clickHandler in the props and
// give the color as parameter
var Color = React.createClass({
  getInitialState: function () {
    return {
      key: uniqueIDMaker.generateID(),
      color: "none",

    };
  },

  shouldComponentUpdate: function(nextProps, nextState) {
    return false;
  },

  componentDidMount: function() {
    this.setState({
      color: this.props.color
    });
    var color = this.state.color;

    $("#" + this.state.key).on('click', function(){
      this.props.clickHandler(color);
    }.bind(this));
  },

  render: function() {
    return <li id={this.state.key} className="color" style={{backgroundColor: this.props.color}}></li>;
  }
});

var MenuBar = React.createClass({
  shouldComponentUpdate: function (nextProps, nextState) {
    return false;
  },

  render: function() {
    return (
      <ul className="menuBar" style={this.props.style}>
        {this.props.items}
      </ul>
    );
  }
});

var CheatSheet = React.createClass({
  render: function() {
    var array = [];
    for(var i = 0; i < this.props.items.length; i++) {
      array.push(<tr key={i}><td><i>{this.props.items[i][0] + ": "}</i></td><td>{this.props.items[i][1]}</td></tr>);
    }
    return (
      <table className="cheatSheet" style={this.props.style}>
        {array}
      </table>
    );
  }
});

// Wrapper around a div, so that I can pass an object called style that
// will be used as a style for the div.
var Line = React.createClass({
  render: function(){
    return (
      <div className="line" style={this.props.style} onmousedown="return false">
        {this.props.innerHTML}
      </div>
      );
  }
});

var Canvas = React.createClass({
  getInitialState: function() {
    return {
      key: uniqueIDMaker.generateID()
    };
  },

  shouldComponentUpdate: function(nextProps, nextState) {
    if(this.props.lines.length !== nextProps.lines.length || this.props.future || nextProps.future) {
      return (this.props.canUpdate || nextProps.canUpdate);
    }

    var l1 = this.props.lines;
    var l2 = nextProps.lines;
    var i = l1.length;
    while(i--) {
      if(l2[i].shouldUpdate || JSON.stringify(l1[i]) !== JSON.stringify(l2[i])) {
        return (this.props.canUpdate || nextProps.canUpdate);
      }
    }

    return false;
  },

  render: function() {
    var array = [];
    var nLines = [];
    var lines = this.props.lines;

    // Draw the past
    for (var i = 0; i < lines.length; i++) {
      if(lines[i] === null) {
        continue;
      }
      var tmp = null;
      if(lines[i].isSelected) {
        tmp = <Line style={{
          position: "absolute",
          border: "1px solid green",
          width: "100%",
          height: "100%"}} />;
      }
      array.push(<Line key={lines[i].key} style={lines[i].style} innerHTML={tmp === null ? (lines[i].innerHTML && lines[i].innerHTML.length === 0 ? null : [lines[i].innerHTML]) : [tmp].concat(lines[i].innerHTML)} />);

      // I'm not sure if it's a good way to do it, but if the lines === null,
      // then you don't save it. So I dynamically recreate an array of objects
      // with only the objects that aren't null.
      // This is to avoid having to do some null checking later
      // It feels fast enough for now
      nLines.push(lines[i]);
    }

    // Some hack: I replace the old array by a newer one that contains only
    // non-null objects
    // this.state.lines = nLines;

    var history = this.props.history;
    var futureStatesClasses = [];

    // Draw the future
    if(this.props.future){
      for (var i = 0; i < history.length; i++) {
        if(history[i] === null) {
          continue;
        }
        var cur = <Line style={{
            position: "absolute",
            border: "1px solid blue",
            width: "100%",
            height: "100%"}} />;
        array.push(<Line key={history[i].key} style={history[i].style} innerHTML={cur === null ? (history[i].innerHTML.length === 0 ? null : [history[i].innerHTML]) : [cur].concat(history[i].innerHTML)} />);
      }
      if(this.props.futureStates.length > 0) {
        var futureStates = this.props.futureStates;
        var startPos = this.props.curTimePosition - 1;
        var k = startPos;
        var l = futureStates.length;
        var prev = null;
        while(k < l) {
          if(prev && futureStates[k] === prev) {
            k++;
            continue;
          }
          var futureLines = JSON.parse(futureStates[k]);

          futureStatesClasses = futureStatesClasses.concat([
            <Canvas opacity={1 - (k - startPos) / (l - startPos)}
                lines={futureLines}
                history={[]}
                future={false}
                canUpdate={true}
                futureStates={[]}/>
          ]);
          k++;
          prev = futureStates[k];
        }
      }
    }
    // console.log("rendering: " + this.state.key)

    return (
      <div className="Canvas"
          key={this.state.key}
          style={{
            width: $(document).width(),
            height: $(document).height(),
            opacity: this.props.opacity
          }
      }>
      {futureStatesClasses}
      {array}
      </div>
    );
  }
});

var App = React.createClass({
  getInitialState: function() {
    return {
      box: {},
      lines: [],
      history: [],
      savedStates: [],
      playing: false,
      recording: false,
      body: null,
      future: false,
      normalMode: false,
      canUpdate: true,
      drawColor: "red",
      pencilWidth: 5,
      curTimePosition: 1,
      FPS: 20
    };
  },

  componentWillMount: function(){
    var lines = [];
    var history = [];
    var savedStates = [];
    var curTimePosition = 1;
    if(localStorage.lines) {
      lines = JSON.parse(localStorage.lines);
    }
    if(localStorage.savedStates) {
      savedStates = JSON.parse(localStorage.savedStates);
    }
    if(localStorage.curTimePosition) {
      curTimePosition = JSON.parse(localStorage.curTimePosition);
    }
    for(var i = 0; i < lines.length; i++) {
      lines[i].key = uniqueIDMaker.generateID();
    }
    // if(localStorage.history) {
    //   history = JSON.parse(localStorage.history);
    // }
    this.setState({
      lines: lines,
      history: history,
      savedStates: savedStates,
      curTimePosition: curTimePosition
    });
  },

  // Load event handlers
  componentDidMount: function(){
    var posX = null, posY = null;
    var mouseDown = false, ctrl = false, shift = false;
    this.setState({
      body: $("#main")[0]
    });

    var time = Date.now();
    var onMouseMove = function(e){
      if(mouseDown && Date.now() - time > 0) {
        if(!posX && !posY) {
          posX = e.clientX;
          posY = e.clientY;
        }
        var x = posX - e.clientX;
        var y = posY - e.clientY;

        // Some optimization, don't draw small divs
        if(Math.sqrt(x*x + y*y) < this.state.pencilWidth * 2) {
          return;
        }

        if(!ctrl) {
          this.drawLine(posX, posY, e.clientX, e.clientY, this.state.pencilWidth, this.state.drawColor);
          posX = e.clientX;
          posY = e.clientY;
        } else {
          if(!shift) {
            this.drawSquare(posX, posY, e.clientX, e.clientY);
            var lines = this.getLinesInBox(this.state.box);

            var i = this.state.lines.length;
            while(i--) {
              this.state.lines[i].isSelected = false;
              this.state.lines[i].shouldUpdate = true;
            }

            var l = lines.length;
            while(l--) {
              lines[l].isSelected = true;
              lines[l].shouldUpdate = true;
            }
          } else {
            var l = this.state.lines;
            var i = l.length;

            while(i--) {
              if(l[i].isSelected) {
                l[i].style.top = l[i].style.top + (e.clientY - posY);
                l[i].style.left = l[i].style.left + (e.clientX - posX);
              }
            }

            this.setState({
              lines: l
            });

            posX = e.clientX;
            posY = e.clientY;
          }
        }

        time = Date.now();
      }
    }.bind(this);

    var onMouseDown = function(e) {
      if(e.which === 1)
        mouseDown = true;
      return false;
    }.bind(this);

    var onMouseUp = function(e) {
      posX = null;
      posY = null;
      mouseDown = false;

      this.setState({
        box: {}
      });
      return false;
    }.bind(this);

    var draw = this.state.body;
    draw.addEventListener('mousemove', onMouseMove, false);
    draw.addEventListener('mousedown', onMouseDown, false);
    draw.addEventListener('mouseup', onMouseUp, false);

    var onKeyDown = function(e){
      // console.log(e.keyCode);
      switch (e.keyCode) {
        // Enter key
        case 13:
          this.setState({
            lines: [],
            savedStates: [],
            curTimePosition: 0
          });
          break;
        // ctrl for selection rectangle
        case 17:
          ctrl = true;
          break;
        // Same as above for mac (command instead of ctrl)
        case 91:
          ctrl = true;
          break;
        // When shift is pressed
        case 16:
          shift = true;
          break;
        case 27:
          var l = this.state.lines;
          var i = l.length;
          while(i--) {
            l[i].isSelected = false;
            l[i].shouldUpdate = true;
          }
          this.setState({
            lines: l
          });
          break;
        case 32:
          if(ctrl){
            this.setState({
              future: !this.state.future
            });
          } else {
            this.togglePlay();
          }
          e.preventDefault();
          break;
        case 37:
          if(ctrl) {
            var n = this.state.curTimePosition > 1 ? --this.state.curTimePosition : 1;
            this.setState({
              curTimePosition: n,
              lines: JSON.parse(this.state.savedStates[n])
            });
          }
          e.preventDefault();
          break;
        case 39:
          if(ctrl) {
            var n = this.state.curTimePosition < this.state.savedStates.length? ++this.state.curTimePosition : this.state.savedStates.length;
            this.setState({
              curTimePosition: n,
              lines: JSON.parse(this.state.savedStates[n])
            });
          }
          e.preventDefault();
          break;
        case 46:
          var l = this.state.lines;
          var i = l.length;
          var n = [];
          while(i--) {
            if(!l[i].isSelected) {
              n.concat([l[i]]);
            }
          }
          this.setState({
            lines: n
          });
          break;
        case 65:
          if(!ctrl) {
            this.setState({
              future: !this.state.future
            });
          } else {
            var l = this.state.lines;
            var i = l.length;
            while(i--) {
              l[i].isSelected = true;
              l[i].shouldUpdate = true;
            }
            this.setState({
              lines: l
            });
          }
          break;
        case 66:
          this.setState({
            lines: this.state.savedStates.lenght > 0 ? JSON.parse(this.state.savedStates[0]) : [],
            curTimePosition: 1
          });

          break;
        case 78:
          this.setState({
            normalMode: !this.state.normalMode
          });
          break;
        case 82:
          this.toggleRecord();
          break;
        case 83:
          if(ctrl) {
            var blob = new Blob([this.state.body.innerHTML], {type: "text/html"});
            if(!this.state.fileName) {
              var i = prompt("Please enter a file name");

              if(!i) {
                return;
              }

              this.setState({
                fileName: i
              });
            }
            saveAs(blob, this.state.fileName + ".image");
            return false;
          }
          break;
        case 89:
          var tmp = this.state.lines;
          var tmp2 = this.state.history;
          if(tmp2.length) {
            var el = tmp2.pop();
            tmp.push(el);
            this.setState({
              lines: tmp,
              history: tmp2
            });
            this.moveCamera(parseInt(el.style.left), parseInt(el.style.top));
          }
          break;
        case 90:
          var tmp = this.state.lines;
          var tmp2 = this.state.history;
          if(tmp.length) {
            var el = tmp.pop();
            tmp2.push(el);
            this.setState({
              lines: tmp,
              history: tmp2
            });
            this.moveCamera(parseInt(el.style.left), parseInt(el.style.top));
          }
          break;
      }
    }.bind(this);

    var onKeyUp = function(e) {
      // Small hack to avoid drawing when you release the ctrl and keep the
      // mouse down
      if(e.keyCode === 17 || e.keyCode === 91) {
        mouseDown = false;
        ctrl = false;
      }

      shift = false;
    }.bind(this);

    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);


    window.onbeforeunload = function() {
      localStorage.lines = JSON.stringify(this.state.lines);
      localStorage.savedStates = JSON.stringify(this.state.savedStates);
      localStorage.curTimePosition = JSON.stringify(this.state.curTimePosition);
      // localStorage.history = JSON.stringify(this.state.history);
      return null;
    }.bind(this);


    var that = this;
    // if file API is available, load the event handlers
    if (window.File && window.FileList && window.FileReader) {
      var filedrag = $("#main")[0];

      filedrag.addEventListener("dragover", FileDragHover, false);
      filedrag.addEventListener("dragleave", FileDragHover, false);
      filedrag.addEventListener("drop", FileSelectHandler, false);
      filedrag.style.display = "block";

      // file selection
      var FileSelectHandler = function(e) {
        // cancel event and hover styling
        FileDragHover(e);

        // fetch FileList object
        var files = e.target.files || e.dataTransfer.files;

        // process all File objects
        for (var i = 0, f; f = files[i]; i++) {
          // Very horrible way of doing it, but I the type of the file doesn't
          // seem to work for the .image that I create
          var reader = new FileReader();
          if(f.name.split(".")[1] === "image") {
            // Create reader
            reader.onloadend = function(event) {
              console.log("Done loading.");
              console.log("Parsing ...");
              // We parse the html, get the styles and return an array of styles
              that.setState({
                lines: that.state.lines.concat(that.parseHTML(event.target.result))
              });
              console.log("Done parsing.");
            };
            reader.readAsText(f);
          } else if (f.type === "image/png") {
            reader.onloadend = function(event) {
              console.log("Done loading.");
              console.log("Parsing ...");

              var img = new Image();
              var canvas = $("#ImACanvas")[0];

              img.src = event.target.result;

              (function(img, canvas, e){
                if (img.complete){
                  canvas.width = img.width;
                  canvas.height = img.height;
                  canvas.getContext('2d').drawImage(img, 0, 0, img.width, img.height);
                  that.parseImage(img, canvas, e.clientX, e.clientY);
                  console.log("Done parsing.");
                } else {
                  setTimeout(arguments.callee, 50);
                }
              })(img, canvas, e);
            };
            reader.readAsDataURL(f);
          }
          console.log("Loading " + f.name + " of type " + f.type + " ...");
        }

      };
      // file drag hover
      var FileDragHover = function(e) {
        e.stopPropagation();
        e.preventDefault();
        e.target.className = (e.type == "Canvas" ? "hover" : "");
      };
    }
  },

  togglePlay: function() {
    this.setState({
      playing: !this.state.playing
    });
    var playingCallback = function () {
      // console.log("Playing: ", this.state.curTimePosition);
      if(this.state.playing) {
        if(this.state.recording) {
          this.setState({
            curTimePosition: ++this.state.curTimePosition
          });
        } else {
          if(this.state.curTimePosition < this.state.savedStates.length) {
            this.setState({
              lines: JSON.parse(this.state.savedStates[this.state.curTimePosition - 1]),
              curTimePosition: ++this.state.curTimePosition
            });
          }
        }
        setTimeout(playingCallback.bind(this), 1000 / this.state.FPS);
      }
    }.bind(this);
    playingCallback();
  },

  toggleRecord: function(){
    this.setState({
      recording: !this.state.recording,
      playing: this.state.recording ? false : this.state.playing
    });
    var recordingCallback = function () {
      // console.log("Recording ", this.state.recording);

      if(this.state.recording){
        var currentState = JSON.stringify(this.state.lines);
        // console.log(this.state.savedStates.length, this.curTimePosition);
        if(this.state.savedStates.length === 0) {
          this.setState({
            savedStates: [JSON.stringify(this.state.lines)],
            curTimePosition: 1
          });
        }
        var bool = this.state.curTimePosition - 1 < this.state.savedStates.length;
        // If the state has changed (aka the user did something)
        if(this.state.savedStates[this.state.curTimePosition - 1] !== currentState) {
          if(bool && !this.state.playing) {
            this.togglePlay();
          }
          if(bool) {
            this.state.savedStates[this.state.curTimePosition - 1] = currentState;
            this.setState({
              savedStates: this.state.savedStates
            });
          } else {
            this.setState({
              savedStates: this.state.lines.length > 0 ? this.state.savedStates.concat([currentState]) : []
            });
          }
        }
        // console.log(this.state.savedStates)

        setTimeout(recordingCallback.bind(this), 1000 / this.state.FPS);
      }
    }.bind(this);
    recordingCallback();
  },

  drawLine: function(x1, y1, x2, y2, width, color) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    var height = Math.sqrt(dx * dx + dy * dy);

    var angle;
    if(this.state.normalMode) {
      angle = Math.PI / 2 + Math.atan2(dy, dx);
    } else {
      angle = Math.atan2(dy, dx);
    }

    var style = {
      width: width,
      height: height + width/4,
      WebkitTransform: "rotate(" + angle + "rad)",
      top: y1 + $(window).scrollTop() - height - 5 - width / 2,
      left: x1 + $(window).scrollLeft() - 8 - width / 2,
      backgroundColor: color
    };

    var innerHTML = "";
    this.setState({
      lines: this.state.lines.concat([{
                style: style,
                innerHTML: innerHTML,
                key: "" + x1+y1+x2+y2+width
              }])
    });
  },

  drawSquare: function(x1, y1, x2, y2) {
    this.setState({
      box: {
        top: y1 + $(window).scrollTop(),
        left: x1 + $(window).scrollLeft(),
        height: y2 - y1,
        width: x2 - x1,
        backgroundColor: "yellow",
        opacity: 0.5,
        position: "absolute"
      }
    });
  },

  getLinesInBox: function (box) {
    var lines = this.state.lines;
    var i = lines.length;
    var selected = [];
    while(i--) {
      var obj = lines[i];
      var s = obj.style;
      if((s.top >= box.top && s.top < box.top + box.height) && (s.left >= box.left && s.left <= box.left + box.width)) {
        selected.push(obj);
      }
    }
    return selected;
  },

  moveCamera: function(x, y) {
    var dy = y - $(window).height() / 2;
    var dx = x - $(window).width() / 2;
    $(document).scrollTop(dy > 0 ? dy : 0);
    $(document).scrollLeft(dx > 0 ? dx : 0);
  },

  parseHTML: function(html) {
    var div = $.parseHTML(html);
    var match = div.reduce(function(acc, val, index) {
      var d = $.parseHTML(val.innerHTML);
      if(!d) {
        return acc;
      }
      return acc.concat(d.reduce(function(a, v, i) {
        var obj = {};
        var s = v.style;
        for(var p in s) {
          // The first parameters of the object style contain the names of the
          // the css properties that have a value other than an empty string
          if(!isNaN(p)) {
            obj[s[p]] = s[s[p]];
            if(s[p] === "left" || s[p] === "top") {
              obj[s[p]] = parseInt(obj[s[p]]);
            }
          }
        }

        return a.concat({
          style: obj,
          innerHTML: d[i].innerHTML.innerHTML,
          key: uniqueIDMaker.generateID()
        });
      }, []));
    }, []);
    return match;
  },

  parseImage: function(img, canvas, offsetX, offsetY) {
    // Stop rendering while we create all those elements
    var saved = this.state.normalMode;
    this.setState({
      canUpdate: false,
      normalMode: true
    });

    var ctx = canvas.getContext("2d");
    var h = img.height, w = img.width;

    var precision = 5;

    for (var i = 1; i < h; i += precision) {
      for (var j = 1; j < w; j += precision) {
        var c1 = ctx.getImageData(j - 1, i - 1, 1, 1).data;
        var c2 = ctx.getImageData(j, i - 1, 1, 1).data;
        var c3 = ctx.getImageData(j + 1, i - 1, 1, 1).data;
        var c4 = ctx.getImageData(j - 1, i, 1, 1).data;
        var c5 = ctx.getImageData(j, i, 1, 1).data;
        var c6 = ctx.getImageData(j + 1, i, 1, 1).data;
        var c7 = ctx.getImageData(j - 1, i + 1, 1, 1).data;
        var c8 = ctx.getImageData(j, i + 1, 1, 1).data;
        var c9 = ctx.getImageData(j + 1, i + 1, 1, 1).data;

        var averageColor = rgbToHex(avColor(c1, c2, c3, c4, c5, c6, c7, c8, c9));
        if(averageColor === "#FFFFFF" || c1[3] === 0 || c2[3] === 0 || c3[3] === 0 || c4[3] === 0 || c5[3] === 0 || c6[3] === 0 || c7[3] === 0 || c8[3] === 0 || c9[3] === 0 ) {
          continue;
        }


        var x = j + offsetX, y = i + offsetY;
        this.drawLine(x - 1, y - 1, x + precision - 1 , y, precision, averageColor);
      }
    }

    canvas.width = canvas.width;

    // Now start the rendering again
    this.setState({
      canUpdate: true,
      normalMode: saved
    });

    function avColor() {
      var average = [0, 0, 0];
      var l = arguments.length;
      for (var i = 0; i < l; i++) {
        average[0] += arguments[i][0];
        average[1] += arguments[i][1];
        average[2] += arguments[i][2];
      }
      return average.map(function(a) {
        return a / l;
      });
    }

    function rgbToHex(arr) {
      var r = arr[0], g = arr[1], b = arr[2];
      return ("#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)).split(".")[0];
    }
  },

  clickHandler: function (e) {
    this.setState({
      drawColor: e
    });
  },

  render: function(){
    var allCanvas = [];
    var l = this.state.lines.length;
    var limit = l > 256 ? 256 : l;
    for (var i = 0; i < l; i += limit) {
      allCanvas = allCanvas.concat([
        <Canvas
              key={i}
              lines={this.state.lines.slice(i, i + limit > l ? l : i + limit)}
              history={[]}
              future={false}
              canUpdate={this.state.canUpdate}
              futureStates={[]}/>
      ]);
    }

    return (
    <div id="main">
      {allCanvas}
      <Canvas lines={[]}
              history={this.state.history}
              future={this.state.future}
              canUpdate={this.state.canUpdate}
              futureStates={this.state.savedStates}
              curTimePosition={this.state.curTimePosition}/>

      <div style={this.state.box} />
      <div style={{
          position: "absolute",
          top: 20,
          left: 150,
          color: "red"
      }}>
        {this.state.recording ? "Recording (frame number " + this.state.curTimePosition + ")" : (this.state.playing) ? "Playing (frame number " + this.state.curTimePosition + ")" : ""}
      </div>

      <MenuBar items={[
            <Color key={1}
                   color="#F21D1D"
                   clickHandler={this.clickHandler} />,
            <Color key={2}
                   color="#526AF2"
                   clickHandler={this.clickHandler} />,
            <Color key={3}
                   color="#47C44A"
                   clickHandler={this.clickHandler} />
          ]}
          style={{
            position: "absolute",
            top: 0,
            left: -30
          }}/>

      <CheatSheet items={[
            ["Left click", "Draw"],
            ["Enter", "Clear Screen"],
            ["Z", "Undo lastest line"],
            ["Y", "Redo lastest line"],
            ["A", "See the future"],
            ["Ctrl (Cmd) + left click", "Select"],
            ["Ctrl (Cmd) + A", "Select All"],
            ["Escape", "Forget selction"],
            ["Delete", "Delete selection"],
            ["Ctrl (Cmd) + shift + left click", "Drag selection"],
            ["Ctrl (Cmd) + S", "Save file"],
            ["Click and drag", "Load file"],
            ["N", "Change pencil type"],
            ["R", "Toggle Record Mode"],
            ["Spacebar", "Toggle Play Mode"],
            ["B", "Back to the start"],
            ["Ctrl (Cmd) + Left", "Request Previous Frame"],
            ["Ctrl (Cmd) + Right", "Request Next Frame"]
          ]}
          style={{
            position: "absolute",
            top: 100,
            left: 10,
            fontSize: 12
          }}/>

      <canvas id="ImACanvas"
          style={{
            position: "absolute",
            top: 100,
            left: 300,
            visibility: "hidden"
          }}/>

    </div>
    );
  }
});

React.render(
  <App />,
  document.body
);
