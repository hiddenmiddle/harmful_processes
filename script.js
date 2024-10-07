// script.js

// Устанавливаем размеры SVG
const width = 800;
const height = 600;

// Создаём SVG-элемент
const svg = d3.select("svg")
              .attr("width", width)
              .attr("height", height);

// Создаём контейнер для тултипа
const tooltip = d3.select("body")
                  .append("div")
                  .attr("class", "tooltip");

// Загружаем данные из JSON-файла
d3.json("graphData.json").then(data => {
  // Вычисляем степень каждого узла (количество связей)
  const nodeDegrees = {};
  data.links.forEach(link => {
    nodeDegrees[link.source] = (nodeDegrees[link.source] || 0) + 1;
    nodeDegrees[link.target] = (nodeDegrees[link.target] || 0) + 1;
  });

  // Создаём симуляцию
  const simulation = d3.forceSimulation(data.nodes)
    .force("link", d3.forceLink(data.links).id(d => d.id).distance(150))
    .force("charge", d3.forceManyBody().strength(-300))
    .force("center", d3.forceCenter(width / 2, height / 2));

  // Добавляем связи
  const link = svg.append("g")
    .attr("class", "links")
    .selectAll("line")
    .data(data.links)
    .join("line")
    .attr("class", "link");

  // Добавляем узлы
  const node = svg.append("g")
    .attr("class", "nodes")
    .selectAll("g")
    .data(data.nodes)
    .join("g")
    .on("mouseover", mouseOver)
    .on("mouseout", mouseOut)
    .call(drag(simulation));

  // Добавляем круги с размером, зависящим от количества связей
  node.append("circle")
    .attr("r", d => 10 + (nodeDegrees[d.id] || 0) * 5);

  // Добавляем текстовые метки
  node.append("text")
    .attr("dx", d => 12 + (nodeDegrees[d.id] || 0) * 5)
    .attr("dy", 4)
    .text(d => d.id);

  // Обновляем симуляцию
  simulation.on("tick", () => {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    node
      .attr("transform", d => `translate(${d.x},${d.y})`);
  });

  // Функции для событий мыши
  function mouseOver(event, d) {
    // Подсвечиваем узел
    d3.select(this).select("circle").classed("highlighted", true);

    // Подсвечиваем связанные связи
    link.filter(l => l.source.id === d.id || l.target.id === d.id)
        .classed("highlighted", true);

    // Показать тултип с индивидуальным текстом
    tooltip.transition()
           .duration(200)
           .style("opacity", .9);
    tooltip.html(d.tooltip)
           .style("left", (event.pageX + 10) + "px")
           .style("top", (event.pageY - 28) + "px");
  }

  function mouseOut(event, d) {
    // Убираем подсветку узла
    d3.select(this).select("circle").classed("highlighted", false);

    // Убираем подсветку связей
    link.filter(l => l.source.id === d.id || l.target.id === d.id)
        .classed("highlighted", false);

    // Скрыть тултип
    tooltip.transition()
           .duration(500)
           .style("opacity", 0);
  }

  // Функции для перетаскивания узлов
  function drag(simulation) {
    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }
}).catch(error => {
  console.error('Error loading or parsing data:', error);
});
