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
let backgroundLayer;
let menuLayer;
let backgroundCtx;
let menuCtx;

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
                    'haystack-radius': .1
                }
            },
            {
                selector: '.railroad',
                style: {
                    'line-color': 'blue',
                    'line-style': 'dotted',
                    'curve-style': 'haystack',
                    'haystack-radius': .2
                }
            },
            {
                selector: '.canal',
                style: {
                    'line-color': 'yellow',
                    'line-style': 'dotted',
                    'curve-style': 'haystack',
                    'haystack-radius': .3
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

    backgroundLayer = cy.cyCanvas({zIndex: -1});
    let backgroundCanvas = backgroundLayer.getCanvas();
    backgroundCtx = backgroundCanvas.getContext('2d');
    menuLayer = cy.cyCanvas({zIndex: 1});
    let menuCanvas = menuLayer.getCanvas();
    menuCtx = menuCanvas.getContext('2d');

    draw();
    cy.on("render cyCanvas.resize", function () {
        draw();
    });

    cy.on('tap', 'node', function (evt) {
        let eventId = evt.target[0]._private.data.id;
        let eventNode = cy.$('#' + eventId);
        switch ($("select#usage_method option:checked").val()) {
            case 'distance':
                if (travelTime.originNode === null) {
                    travelTime.originNode = eventNode;
                } else {
                    if (travelTime.originNode.data('id') !== eventNode.data('id')) {
                        if (travelTime.destinationNode === null ||
                            travelTime.destinationNode.data('id') !== eventNode.data('id')) {
                            clearHighlighted();
                            travelTime.destinationNode = eventNode;
                            findTravelTime();
                        }
                    }
                }
                break;
            case 'spread':
                spreadInfo.originNode = eventNode;
                spreadToAllNodes();
                highlightSpread();
                break;
        }
        draw();
    });
}

/* Canvas */
draw = function () {
    drawBackground();
    backgroundLayer.resetTransform(backgroundCtx);
    backgroundCtx.save();

    drawLegend();
    drawReport();
    backgroundCtx.restore();
};

drawLegend = function () {
    // Outline
    menuCtx.fillStyle = 'black';
    menuCtx.fillRect(10, 975, 300, 210);
    menuCtx.fillStyle = '#FDD585';
    menuCtx.fillRect(15, 980, 290, 200);

    // Title
    menuCtx.font = "small-caps 700 30px system-ui";
    menuCtx.fillStyle = "black";
    menuCtx.textBaseline = "middle";
    menuCtx.fillText("Legend", 20, 1000, 250);

    // Line Style
    menuCtx.setLineDash([7]);
    menuCtx.lineWidth = 20;

    // Road
    menuCtx.fillText("Road 8mph: ", 20, 1050, 180);
    menuCtx.beginPath();
    menuCtx.moveTo(200, 1050);
    menuCtx.lineTo(290, 1050);
    menuCtx.strokeStyle = "#FF0000";
    menuCtx.stroke();

    // Canal
    menuCtx.fillText("Canal 5mph: ", 20, 1100, 180);
    menuCtx.beginPath();
    menuCtx.moveTo(200, 1100);
    menuCtx.lineTo(290, 1100);
    menuCtx.strokeStyle = "#FFFF00";
    menuCtx.stroke();

    // Railroad
    menuCtx.fillText("Railroad 15mph: ", 20, 1150, 180);
    menuCtx.beginPath();
    menuCtx.moveTo(200, 1150);
    menuCtx.lineTo(290, 1150);
    menuCtx.strokeStyle = "#0000FF";
    menuCtx.stroke();
};

drawReport = function () {
    switch ($("select#usage_method option:checked").val()) {
        case 'distance':
            if (travelTime.originNode) {
                backgroundCtx.fillStyle = 'black';
                backgroundCtx.fillRect(10, 10, 400, 300);
                backgroundCtx.fillStyle = 'white';
                backgroundCtx.fillRect(15, 15, 390, 290);

                backgroundCtx.font = "small-caps 700 30px system-ui";
                backgroundCtx.fillStyle = "black";
                backgroundCtx.textBaseline = "middle";
                backgroundCtx.fillText("Origin: " + travelTime.originNode.data('name') + ", " + travelTime.originNode.data('state'), 20, 50, 380);
                if (travelTime.travelMethod) {
                    backgroundCtx.fillText("Travel Method: " + travelTime.travelMethod, 20, 100, 380);
                    if (travelTime.destinationNode) {
                        backgroundCtx.fillText("Destination: " + travelTime.destinationNode.data('name') + ", " + travelTime.destinationNode.data('state'), 20, 150, 380);
                        backgroundCtx.fillText("Distance: " + travelTime.distance + "mi.", 20, 200, 380);
                        backgroundCtx.fillText("Travel Time: " + travelTime.time + "hr.", 20, 250, 380);
                    }
                }
            }
            break;
        case 'spread':
            if (spreadInfo.originNode) {
                backgroundCtx.fillStyle = 'black';
                backgroundCtx.fillRect(10, 10, 400, 80);
                backgroundCtx.fillStyle = 'white';
                backgroundCtx.fillRect(15, 15, 390, 70);

                backgroundCtx.font = "small-caps 700 30px system-ui";
                backgroundCtx.textBaseline = "middle";
                backgroundCtx.fillStyle = "black";
                backgroundCtx.fillText("Origin: " + spreadInfo.originNode.data('name') + ", " + spreadInfo.originNode.data('state'), 20, 50, 380);
            }
            break;
    }
};

drawBackground = function () {
    backgroundLayer.resetTransform(backgroundCtx);
    backgroundLayer.clear(backgroundCtx);
    backgroundLayer.setTransform(backgroundCtx);
    backgroundCtx.save();
    backgroundCtx.drawImage(background, 0, 0, 1000, 1260);
};

/* Common */
calculateDistance = function (nodePath) {
    nodePath = nodePath.filter(function (ele) {
        return ele.isEdge();
    });
    let totalDistance = 0;
    nodePath.forEach(function (edge) {
        totalDistance = totalDistance + parseFloat(edge.data('length'));
    });
    return totalDistance.toFixed(2);
};

timeOnEdge = function (edge) {
    switch (edge._private.data.type) {
        case "road":
            return (parseInt(edge._private.data.length) / 8);
        case "canal":
            return (parseInt(edge._private.data.length) / 5);
        case "railroad":
            return (parseInt(edge._private.data.length) / 15);
    }
};

calculateTime = function (nodePath) {
    nodePath = nodePath.filter(function (ele) {
        return ele.isEdge();
    });
    let totalTime = 0;
    nodePath.forEach(function (edge) {
        totalTime = totalTime + parseFloat(timeOnEdge(edge));
    });
    return totalTime.toFixed(2);
};

let highlightTimeoutSet = new Set();
highlightEle = function (cyElement, delay) {
    let timer = setTimeout(function () {
        this.addClass('highlighted')
    }.bind(cyElement), delay);

    function stop() {
        clearTimeout(timer);
    }

    highlightTimeoutSet.add(stop);
};

clearHighlighted = function () {
    for (let stop of highlightTimeoutSet) {
        stop();
    }
    cy.batch(function () {
        cy.$('.highlighted').forEach(function (ele) {
            ele.removeClass('highlighted');
        });
    });
};

/* Spread to all node functionality */
let spreadInfo = {
    originNode: null,
    pathData: null,
    cityArray: null
};

spreadToAllNodes = function () {
    spreadInfo.pathData = cy.elements().floydWarshall(function (edge) {
        let time;
        switch (edge._private.data.type) {
            case "road":
                time = (parseInt(edge._private.data.length) / 8).toFixed(2);
                break;
            case "canal":
                time = (parseInt(edge._private.data.length) / 5).toFixed(2);
                break;
            case "railroad":
                time = (parseInt(edge._private.data.length) / 15).toFixed(2);
                break;
        }
        return time;
    });
    spreadInfo.cityArray = cy.collection('.city').sort(function (nodeA, nodeB) {
        let pathA = spreadInfo.pathData.path(spreadInfo.originNode, nodeA);
        let pathB = spreadInfo.pathData.path(spreadInfo.originNode, nodeB);
        return calculateTime(pathA) - calculateTime(pathB);
    }).toArray();
};

highlightSpread = function () {
    let i = 0;
    while (i < spreadInfo.cityArray.length) {
        const edgeCount = spreadInfo.pathData.distance(spreadInfo.originNode, spreadInfo.cityArray[i]);
        if (edgeCount !== Infinity) {
            let individualPath = spreadInfo.pathData.path(spreadInfo.originNode, spreadInfo.cityArray[i]);
            highlightEle(spreadInfo.cityArray[i], calculateTime(individualPath) * 500);
        }
        i++;
    }
};

/* Travel time between cities functionality */
let travelTime = {
    originNode: null,
    destinationNode: null,
    travelMethod: "",
    distance: 0,
    time: 0
};

getTravelMethodChecked = function () {
    return $("select#travel_method option:checked").val();
};

findTravelTime = function () {
    if (travelTime.travelMethod === "") {
        showError("Please select a travel method");
    }
    else if (travelTime.originNode !== null && travelTime.destinationNode !== null) {
        let coll = cy.collection().add(cy.nodes('.city'));
        switch (getTravelMethodChecked()) {
            case "road":
                coll = coll.add(cy.edges('.road'));
                break;
            case "canal":
                coll = coll.add(cy.edges('.road'))
                    .add(cy.edges('.canal'));
                break;
            case "railroad":
                coll = coll.add(cy.edges('.road'))
                    .add(cy.edges('.canal'))
                    .add(cy.edges('.railroad'));
                break;
        }
        let dijkstra = coll.dijkstra(travelTime.originNode, function (edge) {
            switch (edge._private.data.type) {
                case "road":
                    return parseInt(edge._private.data.length) / 8;
                case "canal":
                    return parseInt(edge._private.data.length) / 5;
                case "railroad":
                    return parseInt(edge._private.data.length) / 15;
            }
        }, false);
        let nodePath = dijkstra.pathTo(travelTime.destinationNode);
        if (nodePath.length === 1) {
            showError("No connection");
        } else {
            highlightTravelTime(nodePath);
            travelTime.distance = calculateDistance(nodePath);
            travelTime.time = calculateTime(nodePath);
        }
    }
};

highlightTravelTime = function (nodePath) {
    let i = 0;
    while (i < nodePath.length) {
        let el = nodePath[i];
        highlightEle(el, i * 1000);
        i++;
    }
};

/* Event Handlers */
changeTravelHandler = function () {
    if (travelTime.travelMethod === "") {
        clearHighlighted();
        draw();
        travelTime.travelMethod = getTravelMethodChecked();
    }
    if (travelTime.originNode !== null && travelTime.destinationNode !== null || travelTime.originNode === null && travelTime.destinationNode === null) {
        travelTime.distance = 0;
        travelTime.time = 0;
        clearHighlighted();
        onCloseError();
        travelTime.travelMethod = getTravelMethodChecked();
        findTravelTime();
    }
};

changeUsageHandler = function () {
    onReset();
    draw();
    $(".travel_method_wrapper").toggleClass("hidden", $("select#usage_method option:checked").val() !== "distance");
};

onReset = function () {
    spreadInfo.originNode = null;
    spreadInfo.pathData = null;
    spreadInfo.cityArray = null;

    travelTime.originNode = null;
    travelTime.destinationNode = null;
    travelTime.travelMethod = getTravelMethodChecked();
    travelTime.distance = 0;
    travelTime.time = 0;

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
    document.querySelector('select[name="travel_method"]').onchange = changeTravelHandler;
    document.querySelector('select[name="usage_method"]').onchange = changeUsageHandler;
}, false);
