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

    layer = cy.cyCanvas({
        zIndex: -1
    });
    canvas = layer.getCanvas();
    ctx = canvas.getContext('2d');
    function drawStationary() {
        ctx.fillStyle = 'black';
        ctx.fillRect(10, 10, 400, 250);
        ctx.fillStyle = 'white';
        ctx.fillRect(15, 15, 390, 240);

        ctx.font = "small-caps 700 30px system-ui";
        ctx.fillStyle = "black";
        if (travelTime.originNode) {
            ctx.fillText("Origin: " + travelTime.originNode.data('name') + ", " + travelTime.originNode.data('state'), 20, 65, 380);
        }
        if (travelTime.destinationNode) {
            // if (true) {
            ctx.fillText("Destination: " + travelTime.destinationNode.data('name') + ", " + travelTime.destinationNode.data('state'), 20, 115, 380);
            ctx.fillText("Distance: " + travelTime.distance + "mi.", 20, 165, 380);
            ctx.fillText("Travel Time: " + travelTime.time + "hr.", 20, 215, 380);
        }
    }

    function drawBackground() {
        layer.resetTransform(ctx);
        layer.clear(ctx);
        layer.setTransform(ctx);
        ctx.save();
        ctx.drawImage(background, 0, 0, 1000, 1260);
    }

    function draw() {
        drawBackground();
        layer.resetTransform(ctx);
        ctx.save();

        drawStationary();
        ctx.restore();
    }

    draw();
    cy.on("render cyCanvas.resize", function () {
        draw();
    });

    cy.on('tap', 'node', function (evt) {
        let eventId = evt.target[0]._private.data.id;
        switch ($("select#usage_method option:checked").val()) {
            case 'distance':
                let eventNode = cy.$('#' + eventId);
                if (travelTime.originNode === null) {
                    travelTime.originNode = eventNode;
                } else {
                    if (travelTime.originNode.data('id') !== eventNode.data('id')) {
                        if (travelTime.destinationNode === null || travelTime.destinationNode.data('id') !== eventNode.data('id')) {
                            clearHighlighted();
                            travelTime.destinationNode = eventNode;
                            findTravelTime();
                        }
                    }
                }
                break;
            case 'spread':
                let spread = spreadToAllNodes(eventId, []);
                highlightSpread(eventId, spread.pathData, spread.array);
                break;
        }
        draw();
    });
}

/* Common */
calculateDistance = function (nodePath) {
    nodePath = nodePath.filter(function (ele, i) {
        return ele.isEdge();
    });
    let totalDistance = 0;
    nodePath.forEach(function (ele) {
        totalDistance = totalDistance + parseFloat(ele.data('length'));

    });
    return totalDistance.toFixed(2);
};

highlightEle = function (cyElement, delay) {
    setTimeout(function () {
        this.addClass('highlighted')
    }.bind(cyElement), delay);
};

clearHighlighted = function () {
    cy.batch(function () {
        cy.$('.highlighted').forEach(function (ele) {
            ele.removeClass('highlighted');
        });
    });
};

/* Spread to all node functionality */
spreadToAllNodes = function (originId) {
    let fw = cy.elements().floydWarshall(function (edge) {
        return edge.data('length');
    });
    let fwArray = cy.collection('.city').sort(function (a, b) {
        return fw.distance('#' + originId, '#' + a.data('id')) - fw.distance('#' + originId, '#' + b.data('id'));
    }).toArray();
    return {
        pathData: fw,
        array: fwArray
    };
};

highlightSpread = function (originId, pathData, orderedCities) {
    let i = 0;
    while (i < orderedCities.length) {
        const edgeCount = pathData.distance('#' + originId, orderedCities[i]);
        if (edgeCount !== Infinity) {
            let individualPath = pathData.path('#' + originId, orderedCities[i]);
            highlightEle(orderedCities[i], calculateDistance(individualPath) * 50);
        }
        i++;
    }
};

/* Travel time between cities functionality */
let travelTime = {
    originNode: null,
    destinationNode: null,
    distance: 0,
    time: 0
};

findTravelTime = function () {
    let travel_method = $("select#travel_method option:checked").val();
    if (travel_method === "") {
        showError("Please select a travel method");
    }
    else if (travelTime.originNode !== null && travelTime.destinationNode !== null) {
        let coll = cy.collection()
            .add(cy.nodes('.city'))
            .add(cy.edges('.' + travel_method));
        let dijkstra = coll.dijkstra(travelTime.originNode, function (edge) {
            return parseInt(edge._private.data.length);
        }, false);
        let nodePath = dijkstra.pathTo(travelTime.destinationNode);
        if (nodePath.length === 1) {
            showError("No connection");
        } else {
            highlightTravelTime(nodePath);
            let totalDistance = calculateDistance(nodePath);
            travelTime.distance = totalDistance;
        }
    }
};

highlightTravelTime = function (collection) {
    let i = 0;
    while (i < collection.length) {
        let el = collection[i];
        highlightEle(el, i * 1000);
        i++;
    }
};

/* Event Handlers */
changeEventHandler = function () {
    if (travelTime.originNode !== null && travelTime.destinationNode !== null || travelTime.originNode === null && travelTime.destinationNode === null) {
        clearHighlighted();
        onCloseError();
        findTravelTime();
    }
};

onReset = function () {
    travelTime.originNode = null;
    $('#origin-city-name').text("");

    travelTime.destinationNode = null;
    $('#destination-city-name').text("");

    $('#distance-report').text("");

    clearHighlighted();

    onCloseError();
};

showError = function (msg) {
    $('#error-message').text(msg);
    $('#error-div').css("display", "inherit");
};

onCloseError = function () {
    $('#error-message').text("");
    $('#error-div').css("display", "");
};

/* Attach button interactions */
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById("reset-button").onclick = onReset;
    document.getElementById("close-error-button").onclick = onCloseError;
    document.querySelector('select[name="travel_method"]').onchange = changeEventHandler;
}, false);
