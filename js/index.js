var elementData = {};
var xhttp = new XMLHttpRequest();
xhttp.onreadystatechange = function () {
    if (this.readyState === 4 && this.status === 200) {
        elementData = JSON.parse(this.responseText);
        initCytoscape();
    }
};
xhttp.open("GET", "./js/elements.json", true);
xhttp.send();

var cy;

function initCytoscape() {
    cy = cytoscape({
        container: document.getElementById('cy'),
        elements: elementData,
        style: [
            {
                selector: '.city',
                style: {
                    'background-color': 'green',
                    width: '10px',
                    height: '10px',
                    shape: 'circle'
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
                selector: '.highlighted',
                style: {
                    'line-color': 'yellow',
                    'background-color': 'yellow',
                    'transition-property': 'background-color, line-color line-style',
                    'transition-duration': '1s'
                }
            }
        ],
        layout: {name: "preset", fit: false}
    });
    cy.userZoomingEnabled(false);
    cy.panningEnabled(false);
    cy.boxSelectionEnabled(false);
    cy.autolock(true);

    cy.on('tap', 'node', function (evt) {
        switch ($("select#usage_method option:checked").val()) {
            case 'distance':
                var eventNode = cy.$('#' + evt.cyTarget._private.data.id);
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
                var search = findPath(evt.cyTarget._private.data.id);
                var i = 0;
                var highlightSpread = function () {
                    if (i < search.length) {
                        var delay = 1000 * fw.distance('#' + evt.cyTarget._private.data.id, search[i]);
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

}
var fw;
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
    // return cy.elements().bfs(originId, function () {}, false);
};

var originNode = null;
var destinationNode = null;

getDistance = function () {
    var travel_method = $("select#travel_method option:checked").val();
    if (travel_method === "") {
        showError("Please select a travel method");
    } else {
        var collection = cy.collection()
            .add(cy.$('.city'))
            .add(cy.$('.' + travel_method));
        var dijkstra = collection.dijkstra('#' + originNode.data('id'), function () {
            return this.data('length');
        }, false);
        var nodePath = dijkstra.pathTo(destinationNode);
        if (nodePath.length === 1) {
            showError("No connection");
        } else {
            highlightNextEle(0, nodePath);
            calculateDistance(nodePath);
        }
    }
};

highlightNextEle = function (i, nodePath) {
    var el = nodePath[i];
    el.addClass('highlighted');
    if (i < nodePath.length - 1) {
        i++;
        setTimeout(highlightNextEle(i, nodePath), 1000);
    }
};

calculateDistance = function (nodePath) {
    nodePath = nodePath.filter(function (i, ele) {
        return ele.isEdge();
    });
    var totalDistance = 0;
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

