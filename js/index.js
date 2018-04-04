var cy = cytoscape({
    container: document.getElementById('cy'),
    elements: [
        /* Menu */
        /* Railroad Menu */ //{
        //     data: {
        //         id: 'rail',
        //         name: 'Railroad'
        //     },
        //     grabbable: false,
        //     classes: 'menu'
        // },

        /* Cities */
        /* New York, NY */ {
            data: {
                id: 'NewYork',
                name: 'New York'
            },
            grabbable: false,
            classes: 'city'
        },
        /* Boston, MA */ {
            data: {
                id: 'Boston',
                name: 'Boston'
            },
            grabbable: false,
            classes: 'city'
        },
        /* Washington DC */ {
            data: {
                id: "DC",
                name: 'DC'
            },
            grabbable: false,
            classes: 'city'
        },
        /* Richmond, VA */ {
            data: {
                id: "Richmond",
                name: 'Richmond'
            },
            grabbable: false,
            classes: 'city'
        },
        /* Baltimore, MA */ {
            data: {
                id: "Baltimore",
                name: 'Baltimore'
            },
            grabbable: false,
            classes: 'city'
        },

        /* Routes */
        /* Baltimore to DC RR */ {
            data: {
                id: 'Baltimore-DC-RR',
                source: 'DC',
                target: 'Baltimore',
                length: '17.32'
            },
            classes: 'railroad'
        },
        /* DC to Richmond R */ {
            data: {
                id: 'DC-Richmond-R',
                source: 'DC',
                target: 'Richmond',
                length: '52.44',
                'type': 'road'
            },
            classes: 'road'
        },
    ],
    style: [
        {
            selector: '.city',
            style: {
                label: 'data(name)',
                width: '5px',
                height: '5px',
                shape: 'star'
            }
        },
        {
            selector: '.road',
            style: {
                'line-color': 'red'
            }
        },
        {
            selector: '.railroad',
            style: {
                'line-color': 'blue'
            }
        },
        {
            selector: '.highlighted',
            style: {
                'line-color': 'yellow',
                'background-color': 'yellow'
            }
        }
    ]
});
cy.userZoomingEnabled(false);
cy.panningEnabled(false);
cy.boxSelectionEnabled(false);
cy.$('#NewYork').position({x: 731.6192144962017, y: 354.86552984220555});
cy.$('#Boston').position({x: 792.6015696107851, y: 303.39249506610065});
cy.$('#DC').position({x: 665.0176484900919, y: 421.6544006326204});
cy.$('#Richmond').position({x: 655.7937420584498, y: 463.065232456496});
cy.$('#Baltimore').position({x: 673.7803660097145, y: 407.7123397045969});
cy.autolock(true);

var originNode = null;
var destinationNode = null;

cy.on('tap', 'node', function (evt) {
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
});

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
        setTimeout(highlightNextEle(i, nodePath), 500);
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
        getDistance();
    }
};

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById("reset-button").onclick = reset;
    document.getElementById("close-error-button").onclick = closeError;
    document.querySelector('select[name="travel_method"]').onchange = changeEventHandler;
}, false);

