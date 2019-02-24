(function (window) {
    if (typeof window.mattmusc === 'undefined') {
        window.mattmusc = {};
    }
    var mattmusc = window.mattmusc;

    var DonutChart = mattmusc.DonutChart = function (conf) {
        this.parentElement = conf.selector;
        this.variable = conf.variable;
        this.arcClicked = conf.onClick || function() {};
        this.color = conf.color;

        this.init();
    };

    DonutChart.prototype.init = function () {
        var vis = this;

        vis.margin = {
            left: 0,
            right: 0,
            top: 40,
            bottom: 0
        };
        vis.width = 250 - vis.margin.left - vis.margin.right;
        vis.height = 250 - vis.margin.top - vis.margin.bottom;
        vis.radius = Math.min(vis.width, vis.height) / 2;

        vis.pie = d3.pie()
            .padAngle(0.06)
            .value(function (d) {
                return d.data[vis.variable];
            })
            .sort(null);

        vis.arc = d3.arc()
            .innerRadius(vis.radius - 60)
            .outerRadius(vis.radius - 20);

        vis.svg = d3.select(vis.parentElement)
            .append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom);
        vis.g = vis.svg.append("g")
            .attr("transform", "translate(" + (vis.margin.left + (vis.width / 2)) +
                ", " + (vis.margin.top + (vis.height / 2)) + ")");

        vis.g.append("text")
            .attr("y", -vis.height / 2)
            .attr("x", -vis.width / 2)
            .attr("font-size", "15px")
            .attr("text-anchor", "start")
            .text(vis.variable == "market_cap" ?
                "Market Capitalization" : "24 Hour Trading Volume");

        vis.g.append("text")
            .attr("id", vis.parentElement.slice(1) + '-label')
            .attr("y", -10)
            .attr("x", 0)
            .attr("font-size", "12px")
            .attr("text-anchor", "middle");
        
        vis.g.append("text")
            .attr("id", vis.parentElement.slice(1) + '-value')
            .attr("y", 10)
            .attr("x", 2)
            .attr("font-size", "13px")
            .attr("text-anchor", "middle");
    };

    DonutChart.prototype.updateVis = function (chartData) {
        var vis = this;

        vis.path = vis.g.selectAll("path");

        vis.data0 = vis.path.data();
        vis.data1 = vis.pie(chartData.donutData);

        // JOIN elements with new data.
        vis.path = vis.path.data(vis.data1, key);

        // EXIT old elements from the screen.
        vis.path.exit()
            .datum(function (d, i) {
                return findNeighborArc(i, vis.data1, vis.data0, key) || d;
            })
            .transition()
            .duration(750)
            .attrTween("d", arcTween)
            .remove();

        // UPDATE elements still on the screen.
        vis.path.transition()
            .duration(750)
            .attrTween("d", arcTween)
            .attr("fill-opacity", function (d) {
                return (chartData.coins.indexOf(d.data.coin)) > -1  ? 1 : 0.3;
            })

        // ENTER new elements in the array.
        vis.path.enter()
            .append("path")
            .each(function (d, i) {
                this._current = findNeighborArc(i, vis.data0, vis.data1, key) || d;
            })
            .attr("fill", function (d) {
                return vis.color(d.data.coin)
            })
            .attr("fill-opacity", function (d) {
                return (chartData.coins.indexOf(d.data.coin)) > -1  ? 1 : 0.3;
            })
            .on("click", vis.arcClicked)
            .transition()
            .duration(750)
            .attrTween("d", arcTween);

        function key(d) {
            return d.data.coin;
        }

        function findNeighborArc(i, data0, data1, key) {
            var d;
            return (d = findPreceding(i, vis.data0, vis.data1, key)) ? {
                    startAngle: d.endAngle,
                    endAngle: d.endAngle
                } :
                (d = findFollowing(i, vis.data0, vis.data1, key)) ? {
                    startAngle: d.startAngle,
                    endAngle: d.startAngle
                } :
                null;
        }

        // Find the element in data0 that joins the highest preceding element in data1.
        function findPreceding(i, data0, data1, key) {
            var m = vis.data0.length;
            while (--i >= 0) {
                var k = key(vis.data1[i]);
                for (var j = 0; j < m; ++j) {
                    if (key(vis.data0[j]) === k) return vis.data0[j];
                }
            }
        }

        // Find the element in data0 that joins the lowest following element in data1.
        function findFollowing(i, data0, data1, key) {
            var n = vis.data1.length,
                m = vis.data0.length;
            while (++i < n) {
                var k = key(vis.data1[i]);
                for (var j = 0; j < m; ++j) {
                    if (key(vis.data0[j]) === k) return vis.data0[j];
                }
            }
        }

        function arcTween(d) {
            var i = d3.interpolate(this._current, d);
            this._current = i(1)
            // if (d.data.coin === chartData.coins[0]) {
            //     var label = {
            //                 "bitcoin": "Bitcoin",
            //                 "ethereum": "Ethereum",
            //                 "bitcoin_cash": "Bitcoin Cash",
            //                 "litecoin": "Litecoin",
            //                 "ripple": "Ripple"
            //             }[chartData.coins[0]];

            //     d3.select('text#' + vis.parentElement.slice(1) + "-label")
            //         .text(label);
                
            //     var value = d3.format(".1%")(d.value / 10000000000 / 100 );
            //     d3.select('text#' + vis.parentElement.slice(1) + "-value")
            //         .text(value);
            // }
            return function (t) {
                return vis.arc(i(t));
            };
        }
    };

}(window));