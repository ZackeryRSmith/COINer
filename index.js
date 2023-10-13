/******************************************************************** 
 * INITIAL SETUP
 ********************************************************************/

// local variables
let annotations = [];
let annotPointer = 0;
let history = [];
let historyPointer = 0;

let prevWordRange = null;
let currentHoveredWord = null;

// elements on the page
const text = document.getElementById('text');

document.addEventListener('DOMContentLoaded', initialize);

function initialize() {
    setupDraggableLabels();

    text.addEventListener('dragover', handleDragover);
    text.addEventListener('drop', handleDrop);
    text.addEventListener('dragend', handleDragend);

    // control buttons
    const controlButtons = document.querySelector('.buttons').getElementsByTagName('button');
    const prevButton = controlButtons.namedItem('prev');
    const undoButton = controlButtons.namedItem('undo');
    const clearButton = controlButtons.namedItem('clear');
    const redoButton = controlButtons.namedItem('redo')
    const nextButton = controlButtons.namedItem('next');
    prevButton.onclick = f => { displayAnnotation(annotPointer - 1) };
    undoButton.onclick = undo;
    clearButton.onclick = clearTextLabels;
    redoButton.onclick = redo;
    nextButton.onclick = f => { displayAnnotation(annotPointer + 1) };

    // save
    document.getElementsByClassName('centered')[0].getElementsByTagName('button')[1].onclick = saveAnnotation;

    // file loading
    document.getElementById('file-input').addEventListener('change', readSingleFile);

    // export button
    document.getElementsByClassName('centered')[0].getElementsByTagName('button')[0].onclick = exportAnnotation;
}

function setupDraggableLabels() {
    const labels = ['COMMAND', 'OPTION', 'INPUT', 'NUMBER', 'STRING'];

    labels.forEach(label => {
        const element = document.getElementById(label);
        element.addEventListener('dragstart', function (event) {
            event.dataTransfer.setData('text/plain', event.target.id);
        });
    });

    const items = document.querySelectorAll('.labels .box');
    items.forEach(item => {
        item.addEventListener('dragstart', handleDragstart);
        item.addEventListener('dragend', handleDragend);
    });
}

function setOpacity(opacity) {
    return function (event) {
        event.target.style.opacity = opacity;
    }
}

function saveToHistory() {
    history = history.slice(0, historyPointer + 1);
    history.push(text.innerHTML.replace(' hovered-word', ''));
    historyPointer++;
}

/********************************************************************
 * DRAGGING SYSTEM EVENT HANDLERS
 ********************************************************************/
function handleDragstart(event) {
    setOpacity(0.4);
}

function handleDragend(event) {
    setOpacity(1);

    // remove the hovered class from the last hovered word (if any) when dragging ends
    if (prevWordRange && prevWordRange.commonAncestorContainer) {
        prevWordRange.commonAncestorContainer.parentNode && prevWordRange.commonAncestorContainer.parentNode.classList.remove('hovered-word');
        prevWordRange = null;
        currentHoveredWord = null;
    }
};

function handleDragover(event) {
    event.preventDefault();  // required to allow dragging over elements

    let range;
    let textNode;
    let offset;

    if (document.caretPositionFromPoint) {
        const position = document.caretPositionFromPoint(event.clientX, event.clientY);
        if (position) {
            textNode = position.offsetNode;
            offset = position.offset;
        }
    }

    if (prevWordRange && prevWordRange.commonAncestorContainer) {
        // reset the previous hovered word's style
        prevWordRange.commonAncestorContainer.parentNode && prevWordRange.commonAncestorContainer.parentNode.classList.remove('hovered-word');
        prevWordRange = null;
    }

    if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        let start = offset;
        let end = offset;
        const text = textNode.textContent || "";

        while (start > 0 && text[start] !== ' ') {
            start--;
        }

        while (end < text.length && text[end] !== ' ') {
            end++;
        }

        if (!range) {
            range = document.createRange();
        }

        range.setStart(textNode, start);
        range.setEnd(textNode, end);

        const word = range.toString().trim();
        if (word && range.commonAncestorContainer) {
            currentHoveredWord = word;

            prevWordRange = range;
            range.commonAncestorContainer.parentNode && range.commonAncestorContainer.parentNode.classList.add('hovered-word');
        }
    }
};

function handleDrop(event) {
    event.preventDefault();
    const droppedId = event.dataTransfer.getData('text/plain');

    changeClassOfWord(currentHoveredWord, droppedId.toLowerCase())
    console.log(currentHoveredWord)
    visuallyCombineSpans();
    console.log(`Dropped ${droppedId} on word: ${currentHoveredWord}`);
};


/********************************************************************
 * TEXT LABELS
 ********************************************************************/

function visuallyCombineSpans() {
    console.log("here");
    const spans = document.querySelectorAll('#text span');

    let previousSpan = null;

    spans.forEach((span, index) => {
        if (previousSpan && previousSpan.className === span.className) {
            span.classList.add('same-class-adjacent');
            previousSpan.classList.add('same-class-adjacent');
            previousSpan.classList.remove('last-in-series'); // remove last-in-series from previous span
            span.classList.add('last-in-series'); // mark current span as last in series
        } else {
            span.classList.remove('same-class-adjacent', 'last-in-series');
        }
        previousSpan = span;
    });
}

function wrapWordsInSpan(node) {
    if (node.nodeType === Node.TEXT_NODE) {
        // split by words and spaces
        const fragments = node.nodeValue.split(/(\s+)/);
        const parent = node.parentNode;

        fragments.forEach(fragment => {
            if (fragment.trim()) { // if the fragment has content (is a word)
                const span = document.createElement('span');
                span.textContent = fragment;
                parent.insertBefore(span, node);
            } else { // if the fragment is just space(s)
                const space = document.createTextNode(fragment);
                parent.insertBefore(space, node);
            }
        });

        parent.removeChild(node);
    } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== "SPAN") {
        // if the current node is an element and it's not a <span>,
        // recursively check its children

        const childNodes = Array.from(node.childNodes);

        for (let i = 0; i < childNodes.length; i++) {
            wrapWordsInSpan(childNodes[i]);
        }
    }
}

function changeClassOfWord(word, newClass) {
    saveToHistory();

    if (prevWordRange && prevWordRange.commonAncestorContainer) {
        const span = prevWordRange.commonAncestorContainer.parentNode;
        if (span && span.textContent.trim() === word) {
            span.className = newClass;
            return;
        }
    }
}

function clearTextLabels() {
    saveToHistory();

    const spans = text.querySelectorAll('span');

    spans.forEach(span => {
        const classesToRemove = span.className.split(' ').filter(Boolean);
        if (classesToRemove.length) {
            span.classList.remove(...classesToRemove);
        }
    });
}


/********************************************************************
 * FILE HANDLING
 ********************************************************************/
document.getElementById('file-input').addEventListener('change', readSingleFile, false);

function readSingleFile(e) {
    var file = e.target.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function (e) {
        var contents = e.target.result;
        loadContents(contents);
        displayAnnotation(annotPointer);
        document.getElementById('annotator').classList.remove('hidden');
    };
    reader.readAsText(file);
}

function loadContents(contents) {
    annotations = [];
    const lines = contents.split('\n');

    lines.forEach(line => {
        if (line && !line.startsWith('--')) {
            annotations.push(line);
        }
    });

    console.log(annotations)
}

/********************************************************************
 * ANNOT FILE HANDLING & PARSING
 ********************************************************************/
function HTMLToAnnotation() {
    let appendBufferToFinalStr = (b, lc) => {
        if (buffer !== '') {
            return (lc ? ` [${b}](${lc.toUpperCase()})` : ` ${b}`);
        }
        return '';
    };

    let finalStr = '';
    let lastClass = '';
    let buffer = '';

    Array.from(text.childNodes).forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SPAN') {
            const className = node.className
                .replace('same-class-adjacent', '')
                .replace('last-in-series', '')
                .replace('hovered-word', '')
                .replace(/\s+/g, '')
                .trim();

            if (className) {
                if (lastClass === className || lastClass === '') {
                    buffer += (buffer ? ' ' : '') + node.innerText;
                    lastClass = className;
                } else {
                    finalStr += appendBufferToFinalStr(buffer, lastClass);
                    buffer = node.innerText;
                    lastClass = className;
                }
            } else {
                finalStr += appendBufferToFinalStr(buffer, lastClass);
                finalStr += node.innerText;
                buffer = '';
                lastClass = '';
            }
        } else if (node.nodeType === Node.TEXT_NODE) {
            finalStr += appendBufferToFinalStr(buffer, lastClass);
            finalStr += node.nodeValue;
            buffer = '';
            lastClass = '';
        }
    });

    // if we have something in buffer at the end, add it to the final string
    finalStr += appendBufferToFinalStr(buffer, lastClass);
    finalStr = finalStr.trim().replace(/\s+/g, ' '); // ensure we don't have consecutive spaces

    // combine adjacent annotations with the same label
    finalStr = finalStr.replace(/\]\(([A-Z]+)\) \[([^\]]+)\]\(\1\)/g, ` $2]($1)`);

    return finalStr;
}

function exportAnnotation() {
    const file = new File([annotations.join('\n')], 'annot.txt', {
        type: 'text/plain',
    });

    const link = document.createElement('a');
    const url = URL.createObjectURL(file);

    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}

function saveAnnotation() {
    annotations[annotPointer] = HTMLToAnnotation();
}

function annotationToHTML(string) {
    // convert annotations to corresponding span
    string = string.replace(/\[([^\]]+)]\(([A-Z]+)\)/g, function(match, word, className) {
        return word.split(' ').map(segment => `<span class="${className.toLowerCase()}">${segment}</span>`).join(' ');
    });

    // wrap words that aren't already inside a span
    return string.split(' ').map(segment => {
        if (segment.includes('span')) {
            return segment;
        }
        return `<span>${segment}</span>`;
    }).join(' ');
}

function displayAnnotation(p) {
    if (p < 0 || p >= annotations.length) return;

    if (p != annotPointer)
        annotPointer += (p > annotPointer ? 1 : -1)

    history = []
    historyPointer = 0;

    text.innerHTML = annotationToHTML(annotations[annotPointer]);
}

/********************************************************************
 * HISTORY
 ********************************************************************/

function undo() {
    if (historyPointer > 0) {
        historyPointer--;
        text.innerHTML = history[historyPointer];
    }
}

function redo() {
    if (historyPointer < history.length - 1) {
        historyPointer++;
        text.innerHTML = history[historyPointer];
    }
}