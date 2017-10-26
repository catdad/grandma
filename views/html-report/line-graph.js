/* eslint-env browser */
/* globals Dygraph, html2canvas */

window.addEventListener('load', function() {
    var container = document.querySelector('#line-graph-container');
    var plotDiv = document.querySelector('#line-graph');
    var buttons = document.querySelector('#line-graph-buttons');
    var link = document.querySelector('#line-graph-download');

    var TEST = 'fullTest';
    var TESTERR = TEST + '_Err';

    // initialize the download button
    (function(download) {
        download.innerHTML = 'Download PNG';
        download.className = 'pure-button pure-button-primary right';

        download.onclick = function() {
            html2canvas(container).then(function(canvas) {
                link.href = canvas.toDataURL();
                link.download = 'test.png';
                link.click();
            });
        };

        buttons.appendChild(download);
    }(document.createElement('button')));

    function createChart() {
        var yUnits;
        var yDivisor;

        function getMax(graph) {
            return graph.yAxisRange()[1];
        }

        function setYLabel(graph) {
            graph.updateOptions({
                ylabel: yUnits
            }, true);
        }

        function getDivisor(graph) {
            if (yDivisor !== undefined) {
                return yDivisor;
            }

            var max = parseInt(getMax(graph));

            if (max > 1000 * 60) {
                yUnits = 'minutes';
                yDivisor = 1000 * 60;
            } else if (max > 1000) {
                yUnits = 'seconds';
                yDivisor = 1000;
            } else {
                yUnits = 'milliseconds';
                yDivisor = 1;
            }

            setYLabel(graph);

            return yDivisor;
        }

        // this is the function signature required by Dygraph, so ignore
        // the parameter error
        // eslint-disable-next-line max-params
        function yAxisFormatter(number, granularity, opts, graph) {
            var r = number / getDivisor(graph);

            // Apply fixed decimals if the number is not an integer
            if (parseInt(r) === r) {
                return r;
            } else {
                return r.toFixed(2);
            }
        }

        var dataLabels;
        var data = (function(dirtyData, labels) {
            dataLabels = ['Start', TESTERR].concat(labels.filter(function(name) {
                return name !== TESTERR;
            }));

            function idx(label) {
                return dataLabels.indexOf(label);
            }

            return dirtyData

                // build individual record arrays
                .reduce(function(memo, val) {
                    memo[val.id] = memo[val.id] || [];

                    if ([TEST, TESTERR].includes(val.name)) {
                        memo[val.id][0] = val.x;
                    }

                    if (val.name === TEST) {
                        memo[val.id][idx(TESTERR)] = null;
                    } else if (val.name === TESTERR) {
                        memo[val.id][idx(TEST)] = null;
                    }

                    memo[val.id][idx(val.name)] = val.y;

                    return memo;
                }, [])

                // make sure that all of the data entries have the name
                // number of items as the labels... dygraph does not
                // like when there numbers don't match, because it is
                // apparently too hard to assume they are null
                .map(function(val) {
                    if (val.length < labels.length) {
                        for (var i = val.length, l = labels.length; i < l; i++) {
                            val.push(null);
                        }
                    }

                    return val;
                });
        }(
            window.DATA,
            window.LABELS
        ));

        var plot = new Dygraph(
            plotDiv,
            data,
            {
                title: window.TITLE,
                showRoller: true,
                rollPeriod: 1,
                ylabel: 'milliseconds',
                xlabel: 'seconds from start',
                legend: 'always',
                labels: dataLabels,
                axes: {
                    y: {
                        axisLabelFormatter: yAxisFormatter
                    }
                }
            }
        );

        // the first series is always "full Err", which should be red
        var colors = ['rgb(191,0,0)'].concat(plot.colors_);
        plot.updateOptions({
            colors: colors
        });

        // get all of the labels
        var labels = plot.getLabels();
        // remove the first label, which is the x axis
        labels.shift();

        labels.forEach(function(label, i) {
            var active = 'button-active';

            var b = document.createElement('button');
            b.className = 'pure-button ' + active;
            b.innerHTML = label;

            b.onclick = function() {
                if (b.classList.contains(active)) {
                    plot.setVisibility(i, false);
                    b.classList.remove(active);
                } else {
                    plot.setVisibility(i, true);
                    b.classList.add(active);
                }
            };

            buttons.appendChild(b);
        });
    }

    var createdOnce = false;
    window.LINE_GRAPH_INIT = function() {
        if (createdOnce === true) {
            return;
        }

        createdOnce = true;

        createChart();
    };
});
