function registerElement(name, factory) {
  shaka.ui.Controls.registerElement(name, factory);
}

function createIconButton(name, iconName, onClick) {
  const Element = class extends shaka.ui.Element {
    constructor(parent, controls) {
      super(parent, controls);
      this.button_ = document.createElement('span');
      this.button_.className = 'material-icons';
      this.button_.innerText = iconName;
      this.parent.appendChild(this.button_);
      this.eventManager.listen(this.button_, 'click', onClick);
    }
  };

  const Factory = class {
    create(rootElement, controls) {
      return new Element(rootElement, controls);
    }
  };

  registerElement(name, new Factory());
}

function createSpeedButton(name, label, speed) {
  const Element = class extends shaka.ui.Element {
    constructor(parent, controls) {
      super(parent, controls);
      this.button_ = document.createElement('button');
      this.button_.textContent = label;
      this.parent.appendChild(this.button_);
      this.eventManager.listen(this.button_, 'click', () => {
        document.getElementById('video').playbackRate = speed;
      });
    }
  };

  const Factory = class {
    create(rootElement, controls) {
      return new Element(rootElement, controls);
    }
  };

  registerElement(name, new Factory());
}

function createButtonForward() {
  createIconButton('forward_5', 'forward_5', () => {
    document.getElementById('video').currentTime += 5;
  });
}

function createButtonReplay() {
  createIconButton('replay_10', 'replay_10', () => {
    document.getElementById('video').currentTime -= 10;
  });
}

function createButtonV10() {
  createSpeedButton('x1.0', 'x1.0', 1.0);
}

function createButtonV12() {
  createSpeedButton('x1.25', 'x1.25', 1.25);
}

function createButtonV15() {
  createSpeedButton('x1.5', 'x1.5', 1.5);
}

function createButtonV20() {
  createSpeedButton('x2.0', 'x2.0', 2.0);
}
