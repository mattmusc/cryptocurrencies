(function (window) {
    if (typeof window.mattmusc === 'undefined') {
        window.mattmusc = {};
    }
    var mattmusc = window.mattmusc;

    var LineChart = mattmusc.LineChart = function (conf) {
        this.parentElement = conf.selector;
        this.color = conf.color;

        this.init();
    };

    LineChart.prototype.init = function () {
        var vis = this;

        vis.margin = {
            left: 80,
            right: 150,
            top: 50,
            bottom: 100
        };
        vis.height = 550 - vis.margin.top - vis.margin.bottom;
        vis.width = 800 - vis.margin.left - vis.margin.right;

        vis.svg = d3.select(vis.parentElement)
            .append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom);
        vis.g = vis.svg.append("g")
            .attr("transform", "translate(" + vis.margin.left +
                ", " + vis.margin.top + ")");

        vis.t = function () {
            return d3.transition().duration(1000);
        }

        vis.bisectDate = d3.bisector(function (d) {
            return d.date;
        }).left;

        vis.yLabel = vis.g.append("text")
            .attr("class", "y axisLabel")
            .attr("transform", "rotate(-90)")
            .attr("y", -60)
            .attr("x", -170)
            .attr("font-size", "20px")
            .attr("text-anchor", "middle")
            .text("Price (USD)")

        vis.x = d3.scaleTime().range([0, vis.width]);
        vis.y = d3.scaleLinear().range([vis.height, 0]);

        vis.yAxisCall = d3.axisLeft()
        vis.xAxisCall = d3.axisBottom()
            .ticks(4);
        vis.xAxis = vis.g.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + vis.height + ")");
        vis.yAxis = vis.g.append("g")
            .attr("class", "y axis");

        vis.g.append("text")
            .attr("id", "line-chart-label")
            .attr("y", -10)
            .attr("x", 0)
            .attr("font-size", "16px")
            .attr("fill", "#777");

        vis.svg.append("g")
            .attr("class", "legend")
            .attr("y", 10)
            .attr("transform", "translate(" + (800 - vis.margin.right + 20) + "," + vis.margin.top + ")");
    };

    LineChart.prototype.updateVis = function (chartData) {
        var vis = this;

        var filteredData = {};
        chartData.coins.forEach(coin => {
            filteredData[coin] = chartData.data[coin].filter(d => {
                return ((d.date >= chartData.dates[0]) && (d.date <= chartData.dates[1]))
            });
        });

        var xMins = [],
            yMins = [],
            xMaxs = [],
            yMaxs = [];
        chartData.coins.forEach(coin => {
            var data = filteredData[coin];
            xMins.push(d3.min(data, d => d.date));
            xMaxs.push(d3.max(data, d => d.date));
            yMins.push(d3.min(data, d => d[chartData.yVariable]));
            yMaxs.push(d3.max(data, d => d[chartData.yVariable]));
        })
        var xMin = d3.min(xMins);
        var xMax = d3.max(xMaxs);
        var yMin = d3.min(yMins) / 1.005;
        var yMax = d3.max(yMaxs) * 1.005;

        vis.x.domain([xMin, xMax]);
        vis.y.domain([yMin, yMax]);

        var formatSi = d3.format(".2s");

        function formatAbbreviation(x) {
            var s = formatSi(x);
            switch (s[s.length - 1]) {
                case "G":
                    return s.slice(0, -1) + "B";
                case "k":
                    return s.slice(0, -1) + "K";
            }
            return s;
        }

        vis.xAxisCall.scale(vis.x);
        vis.xAxis.transition(vis.t()).call(vis.xAxisCall);
        vis.yAxisCall.scale(vis.y);
        vis.yAxis.transition(vis.t()).call(vis.yAxisCall.tickFormat(formatAbbreviation));

        // Discard old tooltip elements
        d3.select(".focus").remove();
        d3.select(".overlay").remove();

        var line = d3.line()
            .x(function (d) {
                return vis.x(d.date);
            })
            .y(function (d) {
                return vis.y(d[chartData.yVariable]);
            });


        var paths = vis.g.selectAll('.line').data(chartData.coins);

        paths.exit().transition(vis.t).remove();

        paths.enter()
            .append("path")
            .attr("class", "line")
            .attr("fill", "none")
            .attr("stroke-width", "3px")
            .merge(paths)
            .transition(vis.t)
            .attr("stroke", vis.color)
            .transition(vis.t)
            .attr("d", coin => line(filteredData[coin]));


        var focus = vis.g.append("g")
            .attr("class", "focus")
            .style("display", "none");

        focus.append("text")
            .attr("x", 15)
            .attr("dy", ".31em");

        var focusCircles = focus.selectAll('circle').data(chartData.coins);
        focusCircles.exit().transition(vis.t).remove();
        focusCircles.enter().append("circle").attr("class", coin => "circle-" + coin).attr("r", 5);

        var focusTexts = focus.selectAll("text").data(chartData.coins);
        focusTexts.exit().transition(vis.t).remove();
        focusTexts.enter().append("text").attr("class", coin => "circle-" + coin)

        vis.svg.append("rect")
            .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")")
            .attr("class", "overlay")
            .attr("width", vis.width)
            .attr("height", vis.height)
            .on("mouseover", function () {
                focus.style("display", null);
                d3.selectAll('.legendRow').style("display", null);
            })
            .on("mouseout", function () {
                focus.style("display", "none");
                d3.select("#line-chart-label").text("");
                d3.selectAll('.legendRow').style("display", "none");
            })
            .on("mousemove", mousemove);

        function mousemove() {
            var x0 = vis.x.invert(d3.mouse(this)[0]);

            chartData.coins.forEach(coin => {
                var data = filteredData[coin];

                var i = vis.bisectDate(data, x0, 1),
                    d0 = data[i - 1],
                    d1 = data[i],
                    d = (d1 && d0) ? (x0 - d0.date > d1.date - x0 ? d1 : d0) : 0;

                focus.selectAll("circle.circle-" + coin)
                    .attr("transform", "translate(" + vis.x(d.date) + "," + vis.y(d[chartData.yVariable]) + ")")

                d3.select('.legendLabel-' + coin).text(d3.format("$,")(d[chartData.yVariable].toFixed(2)));
            });
        }

        // Update y-axis label
        var newLabel = (chartData.yVariable == "price_usd") ? "Price (USD)" :
            ((chartData.yVariable == "market_cap") ? "Market Capitalization (USD)" :
                "24 Hour Trading Volume (USD)")
        vis.yLabel.text(newLabel);

        // Update legend
        var legendRows = d3.select('g.legend').selectAll('g.legendRow').data(chartData.coins);

        legendRows.exit().remove();

        var rows = legendRows.enter().append('g')
            .attr("class", 'legendRow')
            .style("display", "none")
            .attr("transform", (d, i) => {
                return "translate(0, " + (i * 30) + ")"
            });

        var legendRectangles = rows.selectAll("rect.legendRect").data(chartData.coins);

        legendRectangles.exit().remove()

        legendRectangles.enter().append("rect")
            .attr("class", "legendRect")
            .merge(legendRectangles)
            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", d => {
                return vis.color(d);
            });

        var legendLabels = rows.selectAll("rect.legendLabel").data(chartData.coins);

        legendLabels.exit().remove();

        legendLabels.enter().append("text")
            .attr("class", coin => "legendLabel legendLabel-" + coin)
            .merge(legendLabels)
            .attr("x", 15)
            .attr("y", 10)
            .attr("text-anchor", "start")
            .text("")
    };
}(window));