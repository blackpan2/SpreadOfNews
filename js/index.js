let elementData = {};
let xhttp = new XMLHttpRequest();
xhttp.onreadystatechange = function () {
    if (this.readyState === 4 && this.status === 200) {
        elementData = JSON.parse(this.responseText);
        initCytoscape();
    }
};
xhttp.open("GET", "./js/elements.json", true);
xhttp.send();

let cy;
let layer;
let canvas;
let ctx;

const background = new Image();
background.src = "maps/usMap1835-export.jpg";

function initCytoscape() {
    cy = cytoscape({
        container: document.getElementById('cy'),
        elements: elementData,
        style: [
            {
                selector: '.city',
                style: {
                    'background-color': 'grey',
                    width: '10px',
                    height: '10px'
                }
            },
            {
                selector: '.road',
                style: {
                    'line-color': 'red',
                    'line-style': 'dotted',
                    'curve-style': 'haystack',
                    'haystack-radius': 0
                }
            },
            {
                selector: '.railroad',
                style: {
                    'line-color': 'blue',
                    'line-style': 'dotted',
                    'curve-style': 'haystack',
                    'haystack-radius': 0
                }
            },
            {
                selector: '.canal',
                style: {
                    'line-color': 'yellow',
                    'line-style': 'dotted',
                    'curve-style': 'haystack',
                    'haystack-radius': 0
                }
            },
            {
                selector: '.highlighted',
                style: {
                    'line-color': 'green',
                    'background-color': 'green',
                    'transition-property': 'background-color, line-color line-style',
                    'transition-duration': '1s'
                }
            }
        ],
        layout: {name: "preset", fit: false}
    });
    cy.boxSelectionEnabled(false);
    cy.autolock(true);

    cy.on('tap', 'node', function (evt) {
        let eventId = evt.target[0]._private.data.id;
        switch ($("select#usage_method option:checked").val()) {
            case 'distance':
                let eventNode = cy.$('#' + eventId);
                if (originNode === null) {
                    $('#origin-city-name').text(eventNode.data('name'));
                    originNode = eventNode;
                } else {
                    if (originNode.data('id') !== eventNode.data('id')) {
                        if (destinationNode === null || destinationNode.data('id') !== eventNode.data('id')) {
                            clearHighlighted();
                            destinationNode = eventNode;
                            $('#destination-city-name').text(eventNode.data('name'));
                            getDistance();
                        }
                    }
                }
                break;
            case 'spread':
                let search = findPath(eventId);
                let i = 0;
                let highlightSpread = function () {
                    if (i < search.length) {
                        const delay = 1000 * fw.distance('#' + eventId, search[i]);
                        if (delay !== Infinity) {
                            setTimeout(function () {
                                this.addClass('highlighted')
                            }.bind(search[i]), delay);
                        }
                        i++;
                        highlightSpread()
                    }
                };
                highlightSpread();
                break;
        }
    });

    layer = cy.cyCanvas({
        zIndex: -1
    });
    canvas = layer.getCanvas();
    ctx = canvas.getContext('2d');
    cy.on("render cyCanvas.resize", function (evt) {
        layer.resetTransform(ctx);
        layer.clear(ctx);
        layer.setTransform(ctx);

        ctx.save();
        // Draw a background
        ctx.drawImage(background, 0, 0, 1000, 1260);

        // // Draw text that follows the model
        // ctx.font = "24px Helvetica";
        // ctx.fillStyle = "black";
        // ctx.fillText("This text follows the model", 200, 300);

        // Draw text that is fixed in the canvas
        layer.resetTransform(ctx);
        ctx.save();
        ctx.restore();
    });
    layer.resetTransform(ctx);
    layer.clear(ctx);
    layer.setTransform(ctx);
    ctx.save();
    ctx.drawImage(background, 0, 0, 1000, 1260);
    layer.resetTransform(ctx);
    ctx.save();
    ctx.restore();
}

let fw;
spreadToAllNodes = function (originId) {
    fw = cy.elements().floydWarshall(function (edge) {
        return edge.data('length');
    });
    return cy.collection('.city').sort(function (a, b) {
        return fw.distance('#' + originId, '#' + a.data('id')) - fw.distance('#' + originId, '#' + b.data('id'));
    }).toArray();
};

findPath = function (originId) {
    return spreadToAllNodes(originId, []);
};

let originNode = null;
let destinationNode = null;

getDistance = function () {
    let travel_method = $("select#travel_method option:checked").val();
    if (travel_method === "") {
        showError("Please select a travel method");
    } else {
        let coll = cy.collection()
            .add(cy.nodes('.city'))
            .add(cy.edges('.' + travel_method));
        let dijkstra = coll.dijkstra(originNode, function (edge) {
            return parseInt(edge._private.data.length);
        }, false);
        let nodePath = dijkstra.pathTo(destinationNode);
        if (nodePath.length === 1) {
            showError("No connection");
        } else {
            highlightNextEle(0, nodePath);
            calculateDistance(nodePath);
        }
    }
};

highlightNextEle = function (i, nodePath) {
    let el = nodePath[i];
    el.addClass('highlighted');
    if (i < nodePath.length - 1) {
        i++;
        setTimeout(highlightNextEle(i, nodePath), 1000);
    }
};

calculateDistance = function (nodePath) {
    nodePath = nodePath.filter(function (ele, i) {
        return ele.isEdge();
    });
    let totalDistance = 0;
    nodePath.forEach(function (ele, i, eles) {
        totalDistance = totalDistance + parseFloat(ele.data('length'));

    });
    $('#distance-report').text(totalDistance);
};

showError = function (msg) {
    $('#error-message').text(msg);
    $('#error-div').css("display", "inherit");
};

closeError = function () {
    $('#error-message').text("");
    $('#error-div').css("display", "");
};

reset = function () {
    originNode = null;
    $('#origin-city-name').text("");

    destinationNode = null;
    $('#destination-city-name').text("");

    $('#distance-report').text("");

    clearHighlighted();

    closeError();
};

clearHighlighted = function () {
    cy.batch(function () {
        cy.$('.highlighted').forEach(function (ele) {
            ele.removeClass('highlighted');
        });
    });
};

changeEventHandler = function () {
    if (originNode !== null && destinationNode !== null) {
        clearHighlighted();
        closeError();
        getDistance();
    }
};

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById("reset-button").onclick = reset;
    document.getElementById("close-error-button").onclick = closeError;
    document.querySelector('select[name="travel_method"]').onchange = changeEventHandler;
}, false);

