function ui(id) {
    return document.getElementById(id);
}
function getColor(selector) {
    var element = document.querySelector(selector);
    var style = window.getComputedStyle(element);
    return style.getPropertyValue('color');
}

class State {
    constructor(mainPage) {
	this.idx = 0;
	this.images = [];
	this.annotations = {};
	this.classes = new Set();
	this.settings = null;

	this.mainPage = mainPage;
	this.page = mainPage;
	
	this.autoActive = false;
	this.autoIdx = 0;

	window.addEventListener('keydown', e => {
	    if (this.page !== this.mainPage) {return;}
	    
	    switch(e.key) {
	    case 'Enter':
		e.preventDefault();
		this.annotateImage();
		break;
	    case 'ArrowLeft':
		e.preventDefault();
		this.prev();
		break;
	    case 'ArrowRight':
		e.preventDefault();
		this.next();
		break;
	    case 'Tab':
		e.preventDefault();
		if (!this.autoActive) {this.autoStart();}
		else if (this.autoActive) {this.autoStop()};
		break;
	    case 'ArrowDown':
		e.preventDefault();
		this.autoChange(+1);
		break;
	    case 'ArrowUp':
		e.preventDefault();
		this.autoChange(-1);
		break;
	    }
	});
    }
    // -------------------------------------------------------------------------
    uploadImages() {
	const files = ui('upload-images').files;
	this.images = Array.from(files).sort(
	    (file1, file2) => file2.size - file1.size
	);
	this.updateImage();
    }
    updateImage() {
	if (this.images.length === 0) {return;}
	const image = this.images[this.idx];
	ui('image-view').src = URL.createObjectURL(image);
	ui('image-file-name').textContent = image.name;
	ui('image-count').textContent = `[${this.idx+1}/${this.images.length}]`;

	if (this.annotations[image.name]) {
	    ui('class-input').value = this.annotations[image.name];
	}
	else if (this.autoActive) {
	    const children = [...ui('autocomplete').children];
	    ui('class-input').value = children[this.autoIdx].textContent;
	}
	else if (!this.autoActive) {
	    ui('class-input').value = '';
	}

	this.colorClassInput();
    }
    annotateImage() {
	if (this.images.length === 0) {return;}
	const image = this.images[this.idx];
	if (ui('class-input').value.trim() !== '') {
	    const annotation = ui('class-input').value || '';
	    
	    let newClass = false;
	    if (!this.classes.has(annotation)) {
		newClass = true;
		const accept = confirm(`Create new class? (${annotation})`);		
		if (!accept) {return;}
	    }
	    this.annotations[image.name] = annotation;	    
	    this.classes.add(annotation);

	    if (newClass && this.autoActive) {
		this.autoStop();
		const classes = [...this.classes];
		classes.sort();
		this.autoIdx = classes.indexOf(annotation);
		console.log(this.autoIdx);
		this.autoStart();
	    }
	}
	
	this.next();	
    }
    next() {
	this.idx = Math.min(this.idx + 1, this.images.length-1);
	this.updateImage();	
    }
    prev() {
	this.idx = Math.max(this.idx - 1, 0);
	this.updateImage();
    }
    // -------------------------------------------------------------------------
    downloadAnnotations() {
	const json = JSON.stringify(this.annotations, null, 2);
	const blob = new Blob([json], {type: "application/json"});
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = (this.images.length == 0) ? 'annotations.json'
	    : this.images[0].name.split('_').splice(0, 2).join('_') + '.json';
	a.click();
    }
    uploadAnnotations() {
	const file = ui('upload-annotations').files[0];
	
	const reader = new FileReader();
	reader.onload = (event) => {
	    const contents = event.target.result;
	    this.annotations = {...JSON.parse(contents), ...this.annotations};
	    this.classes = new Set([
		...this.classes,
		...Object.values(this.annotations),
	    ]);	    
	    this.updateImage();
	};
	reader.onerror = (event) => {
	    console.error("File could not be read! Code " + event.target.error.code);
	};
	reader.readAsText(file);
    }
    uploadClasses() {
	const file = ui('upload-classes').files[0];
	
	const reader = new FileReader();
	reader.onload = (event) => {
	    const contents = event.target.result;
	    const newClasses = JSON.parse(contents);
	    console.log(newClasses)
	    this.classes = new Set([
		...this.classes,
		...newClasses,
	    ]);
	    this.updateImage();
	};
	reader.onerror = (event) => {
	    console.error("File could not be read! Code " + event.target.error.code);
	};
	reader.readAsText(file);
    }
    uploadConfig() {
	const file = ui('upload-config').files[0];
	
	const reader = new FileReader();
	reader.onload = (event) => {
	    const contents = event.target.result;
	    this.settings = JSON.parse(contents);
	    this.classes = new Set([
		...this.classes,
		...this.settings.classes,
	    ]);	    
	    this.updateImage();
	};
	reader.onerror = (event) => {
	    console.error("File could not be read! Code " + event.target.error.code);
	};
	reader.readAsText(file);
    }
    // -------------------------------------------------------------------------
    autoStart() {
	if (this.images.length === 0) {return;}
	
	const classes = [...this.classes];
	classes.sort();

	// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
	const classInput = ui('class-input').value;
	const filteredClasses = classes.filter(className => className.startsWith(classInput));
	// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++	
		
	filteredClasses.forEach((className, idx) => {
	    const span = document.createElement("span");
	    span.textContent = className;
	    span.classList.add("autoitem");
	    if (idx === this.autoIdx) {
		span.classList.add("autoselected");
	    }
	    
	    ui('autocomplete').appendChild(span);
	});
	
	if (filteredClasses.length === 0) {return;} // Has to come after filteredClasses, duh...
	
	this.autoActive = true;
	
	const children = [...ui('autocomplete').children];

	if (children.length > 0) {
	    ui('class-input').value = children[0].textContent;
	}

	this.colorClassInput();
    }
    autoStop() {
	while (ui('autocomplete').firstChild) {
	    ui('autocomplete').removeChild(ui('autocomplete').firstChild);
	}
	
	this.autoActive = false;	
	ui('class-input').value = '';
	this.colorClassInput();
    }
    autoChange(delta) {
	if (!this.autoActive) {return;}
	
	const children = [...ui('autocomplete').children];
	[...children].forEach(span => {
	    span.classList.remove('autoselected');	    
	});
	
	this.autoIdx += delta;
	this.autoIdx = (this.autoIdx + this.classes.size) % this.classes.size;
	children[this.autoIdx].classList.add('autoselected');
	
	ui('class-input').value = children[this.autoIdx].textContent;
	
	this.colorClassInput();
    }
    // -------------------------------------------------------------------------
    toPage(pageId) {
	document.querySelectorAll('.page').forEach(page => {
	    if (page.id !== pageId) {		
		page.style.display = 'none';
	    }
	});
	ui(pageId).style.display = 'block';
	this.page = pageId;
    }
    colorClassInput() {
	const value = ui('class-input').value;
	const image = this.images[this.idx];
		
	if (value === this.annotations[image.name]) {
	    ui('class-input').style.color = getColor('.annotated');
	}
	else if (this.classes.has(value)) {
	    ui('class-input').style.color = getColor('.autoselected');
	}
	else {
	    ui('class-input').style.color = getColor('.newclass');
	}
    }
}
const state = new State('annotate-page');
function init() {
    state.toPage('upload-page');    
}
init();
