class StyleScratchpadControl {
  constructor(options = {}) {
    this.options = {
      heightRate: 0.5,
      minHeight: 100,
      maxHeightRate: 0.9,
      ...options,
    };

    // state
    this.isOpen = false;

    // DOM refs
    this.container = null;
    this.panel = null;
    this.handle = null;
    this.content = null;
    this.toolbar = null;
    this.textarea = null;
    this.toggleButton = null;
    this.okButton = null;
    this.clearButton = null;

    // drag state
    this.startY = 0;
    this.startHeight = 0;

    // bind
    this._onToggle = this._onToggle.bind(this);
    this._onDragStart = this._onDragStart.bind(this);
    this._onDragMove = this._onDragMove.bind(this);
    this._onDragEnd = this._onDragEnd.bind(this);
    this._onResize = this._onResize.bind(this);
    this._onLoadClick = this._onLoadClick.bind(this);
    this._onLoadFileChange = this._onLoadFileChange.bind(this);
    this._onSaveClick = this._onSaveClick.bind(this);
    this._onApplyClick = this._onApplyClick.bind(this);
  }

  // -------------------------
  // MapLibre Lifecycle
  // -------------------------

  onAdd(map) {
    this.map = map;

    this._createUI();
    this._bindUIEvents();
    this._bindMapEvents();
    this._initializeStyleFromMap();

    return this.container;
  }

  onRemove() {
    this._close();

    this._unbindUIEvents();
    this._unbindMapEvents();

    this.container?.remove();
    this.panel?.remove();

    this.map = undefined;
  }

  // -------------------------
  // State control
  // -------------------------

  _onToggle() {
    this.isOpen ? this._close() : this._open();
  }

  _open() {
    if (this.isOpen) return;

    this.isOpen = true;

    const container = this.map.getContainer();
    const height = this._getInitialHeight(container);

    this._applyHeight(height);
    this._applyMapMargin(height);
    this._syncLayout();
    this.map.resize();
  }

  _close() {
    if (!this.isOpen) return;

    this.isOpen = false;

    this._applyHeight(0);
    this._applyMapMargin(0);

    this.map.resize();
  }

  _bindMapEvents() {
    this.map.on("resize", this._onResize);
  }

  _unbindMapEvents() {
    this.map?.off("resize", this._onResize);
  }

  // -------------------------
  // UI Events
  // -------------------------

  _bindUIEvents() {
    this.toggleButton.addEventListener("click", this._onToggle);
    this.loadButton.addEventListener("click", this._onLoadClick);
    this.loadInput.addEventListener("change", this._onLoadFileChange);
    this.saveButton.addEventListener("click", this._onSaveClick);
    this.applyButton.addEventListener("click", this._onApplyClick);
    this.handle.addEventListener("mousedown", this._onDragStart);
  }

  _unbindUIEvents() {
    this.toggleButton?.removeEventListener("click", this._onToggle);
    this.loadButton?.removeEventListener("click", this._onLoadClick);
    this.loadInput?.removeEventListener("change", this._onLoadFileChange);
    this.saveButton?.removeEventListener("click", this._onSaveClick);
    this.applyButton?.removeEventListener("click", this._onApplyClick);
    this.handle?.removeEventListener("mousedown", this._onDragStart);

    document.removeEventListener("mousemove", this._onDragMove);
    document.removeEventListener("mouseup", this._onDragEnd);
  }

  // -------------------------
  // Event Handlers
  // -------------------------

  _onLoadClick() {
    this.loadInput.click();
  }

  _onLoadFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    this._readFile(file);
    e.target.value = "";
  }

async _onSaveClick() {
  const data = this.textarea.value;

  // modern API
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: "style.json",
        types: [
          {
            description: "JSON File",
            accept: { "application/json": [".json"] },
          },
        ],
      });

      const writable = await handle.createWritable();
      await writable.write(data);
      await writable.close();

      return;
    } catch (e) {
      console.warn("Save canceled or failed", e);
      return;
    }
  }

  // fallback
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "style.json";
  a.click();

  URL.revokeObjectURL(url);
}

  _onApplyClick() {
    try {
      const style = JSON.parse(this.textarea.value);
      this.map.setStyle(style);
    } catch (e) {
      console.error("Invalid JSON", e);
    }
  }

  _onResize() {
    if (!this.isOpen) return;
    this._syncLayout();
  }

  _onDragStart(e) {
    e.preventDefault();

    document.body.style.cursor = "ns-resize";

    this.startY = e.clientY;
    this.startHeight = this.panel.offsetHeight;

    document.addEventListener("mousemove", this._onDragMove);
    document.addEventListener("mouseup", this._onDragEnd);
  }

  _onDragMove(e) {
    const dy = this.startY - e.clientY;
    this._setHeightFromDrag(dy);

    this.map.resize();
  }

  _onDragEnd() {
    document.body.style.cursor = "";

    document.removeEventListener("mousemove", this._onDragMove);
    document.removeEventListener("mouseup", this._onDragEnd);
  }

  // -------------------------
  // Layout helpers
  // -------------------------

  _getInitialHeight(container) {
    const rect = container.getBoundingClientRect();
    return rect.height * this.options.heightRate;
  }

  _syncLayout() {
    const container = this.map.getContainer();

    this.panel.style.left = "0px";
    this.panel.style.width = `${container.clientWidth}px`;
  }

  _setHeightFromDrag(dy) {
    const height = this._getClampedHeight(dy);
    this._applyHeight(height);
    this._applyMapMargin(height);
  }

  _getClampedHeight(dy) {
    const container = this.map.getContainer();

    const maxHeight =
      container.getBoundingClientRect().height * this.options.maxHeightRate;

    const raw = this.startHeight + dy;

    return Math.max(this.options.minHeight, Math.min(maxHeight, raw));
  }

  _applyHeight(height) {
    this.panel.style.height = `${height}px`;
  }

  _applyMapMargin(height) {
    this.map.getContainer().style.marginBottom = `${height}px`;
  }

  // -------------------------
  // Internal Helpers
  // -------------------------

  _readFile(file) {
    const reader = new FileReader();

    reader.onload = () => {
      this.textarea.value = reader.result;
    };

    reader.readAsText(file);
  }

  _updateTextareaFromMap() {
    const style = this.map.getStyle();

    if (style?.layers?.length) {
      this.textarea.value = JSON.stringify(style, null, 2);
    }
  }

  _initializeStyleFromMap() {
    this.map.once("idle", () => {
      this._updateTextareaFromMap();
    });
  }

  // -------------------------
  // Value Interface
  // -------------------------

  getValue() {
    return {
      text: this.textarea.value,
    };
  }

  setValue(value = {}) {
    if (value.text !== undefined) {
      this.textarea.value = value.text;
    }
  }

  // -------------------------
  // UI
  // -------------------------

  _createUI() {
    this._createDOM();
    this._assemble();
  }
  _createDOM() {
    this._createContainer();
    this._createToggleButton();
    this._createPanel();

    this._createHandle();
    this._createContent();
    this._createToolbar();
    this._createLoadButton();
    this._createSaveButton();
    this._createApplyButton();
    this._createTextarea();
  }

  _assemble() {
    this.container.appendChild(this.toggleButton);

    // bottom sheet is rendered outside map container to avoid attribution overlap
    document.body.appendChild(this.panel);

    this.panel.appendChild(this.handle);
    this.panel.appendChild(this.content);

    this.content.appendChild(this.toolbar);
    this.toolbar.appendChild(this.loadButton);
    this.toolbar.appendChild(this.saveButton);
    this.toolbar.appendChild(this.applyButton);
    this.content.appendChild(this.textarea);
  }

  // -------------------------
  // UI Parts
  // -------------------------

  _createContainer() {
    this.container = document.createElement("div");
    this.container.className =
      "maplibregl-ctrl maplibregl-ctrl-group style-scratchpad-ctrl";
  }

  _createToggleButton() {
    this.toggleButton = document.createElement("button");
    this.toggleButton.textContent = "{;}";
    this.toggleButton.title = "Style Scratchpad";
  }

  _createPanel() {
    this.panel = document.createElement("div");

    Object.assign(this.panel.style, {
      position: "fixed",
      bottom: "0",
      left: "0",
      width: "100%",
      height: "0px",
      background: "white",
      borderTop: "1px solid #ccc",
      zIndex: "1000",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
    });
  }

  _createHandle() {
    this.handle = document.createElement("div");

    Object.assign(this.handle.style, {
      height: "6px",
      cursor: "ns-resize",
      background: "#ccc",
    });
  }

  _createContent() {
    this.content = document.createElement("div");

    Object.assign(this.content.style, {
      padding: "8px",
      display: "flex",
      flexDirection: "column",
      flex: "1",
      overflow: "hidden",
      minHeight: "0",
    });
  }

  _createToolbar() {
    this.toolbar = document.createElement("div");

    Object.assign(this.toolbar.style, {
      marginBottom: "4px",
      display: "flex",
      gap: "4px",
      flex: "0 0 auto",
    });
  }

  _createLoadButton() {
    this.loadInput = document.createElement("input");
    this.loadInput.type = "file";
    this.loadInput.accept = ".json";
    this.loadInput.style.display = "none";

    this.loadButton = document.createElement("button");
    this.loadButton.textContent = "Load";
  }

  _createSaveButton() {
    this.saveButton = document.createElement("button");
    this.saveButton.textContent = "Save";
  }

  _createApplyButton() {
    this.applyButton = document.createElement("button");
    this.applyButton.textContent = "Apply";
  }

  _createTextarea() {
    this.textarea = document.createElement("textarea");
    this.textarea.placeholder = "Enter text...";

    Object.assign(this.textarea.style, {
      flex: "1",
      width: "100%",
      height: "100%",
      resize: "none",
      overflow: "auto",
      minHeight: "0",
      boxSizing: "border-box",
      margin: "0",
    });
  }
}

export default StyleScratchpadControl;
