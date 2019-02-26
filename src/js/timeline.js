/*
 *    timeline.js
 *    Mastering Data Visualization with D3.js
 *    10.6 - D3 Brushes
 */

Timeline = function (_parentElement, _brushed, _brushEnd) {
    this.parentElement = _parentElement;
    this.brushed = _brushed || function () {};
    this.brusheEnd = _brushEnd || function () {};

    this.initVis();
};

Timeline.prototype.initVis = function () {
    var vis = this;

    vis.margin = {
        top: 0,
        right: 150,
        bottom: 30,
        left: 80
    };
    vis.width = 800 - vis.margin.left - vis.margin.right;
    vis.height = 130 - vis.margin.top - vis.margin.bottom;

    vis.svg = d3.select(vis.parentElement).append("svg")
        .attr("width", vis.width + vis.margin.left + vis.margin.right)
        .attr("height", vis.height + vis.margin.top + vis.margin.bottom)

    vis.t = () => {
        return d3.transition().duration(1000);
    }

    vis.g = vis.svg.append("g")
        .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

    vis.x = d3.scaleTime().range([0, vis.width]);

    vis.xAxisCall = d3.axisBottom().ticks(4);

    vis.xAxis = vis.g.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + vis.height + ")");

    vis.areaPath = vis.g.append("path").attr("fill", "#ccc");

    vis.brush = d3.brushX()
        .handleSize(10)
        .extent([
            [0, 0],
            [vis.width, vis.height]
        ])
        .on("brush", vis.brushed)
        .on("end", vis.brusheEnd);

    // Append brush component
    vis.brushComponent = vis.g.append("g").attr("class", "brush");
};

Timeline.prototype.updateVis = function (chartData) {
    var vis = this;

    vis.data = d3.timeDay.range(chartData.dates[0], chartData.dates[1]);

    var extent = d3.extent(vis.data);
    vis.x.domain(extent);

    vis.xAxisCall.scale(vis.x);
    vis.xAxis.transition(vis.t()).call(vis.xAxisCall);

    vis.area = d3.area()
        .x(function (d) {
            return vis.x(d.date);
        })
        .y0(vis.height)
        .y1(0);

    vis.areaPath.data(vis.data).attr("d", vis.area);

    vis.brushComponent.call(vis.brush);
}
