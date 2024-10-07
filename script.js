// script.js

// Устанавливаем размеры SVG на всю доступную область
const svg = d3.select("svg")
  .attr("width", "100%")
  .attr("height", "100%");

// Создаём контейнер для тултипа
const tooltip = d3.select("body")
  .append("div")
  .attr("class", "tooltip");

// Переменные для данных графа и симуляции
let graphData = { nodes: [], links: [] };
let simulation;

// Функция для загрузки данных
function loadData(callback) {
  const storedData = localStorage.getItem('graphData');
  if (storedData) {
    graphData = JSON.parse(storedData);
    // Обеспечиваем консистентность типов данных
    prepareData();
    callback();
  } else {
    // Загружаем данные из JSON-файла
    d3.json("graphData.json").then(data => {
      graphData = data;
      // Обеспечиваем консистентность типов данных
      prepareData();
      callback();
    }).catch(error => {
      console.error('Ошибка загрузки или парсинга данных:', error);
    });
  }
}

// Функция для подготовки данных
function prepareData() {
  // Преобразуем идентификаторы узлов в строки
  graphData.nodes.forEach(node => {
    node.id = String(node.id);
    node.tooltip = node.tooltip || '';
  });

  // Преобразуем source и target в строковые идентификаторы
  graphData.links.forEach(link => {
    link.source = String(typeof link.source === 'object' ? link.source.id : link.source);
    link.target = String(typeof link.target === 'object' ? link.target.id : link.target);
  });
}

// Функция для сохранения данных
function saveData() {
  localStorage.setItem('graphData', JSON.stringify(graphData));
  updateGraph();
}

// Функция для обновления графа
function updateGraph() {
  // Очищаем SVG
  svg.selectAll("*").remove();

  // Вычисляем размеры SVG
  const width = svg.node().clientWidth;
  const height = svg.node().clientHeight;

  // Создаём словарь узлов по id
  const nodesById = {};
  graphData.nodes.forEach(node => {
    nodesById[node.id] = node;
  });

  // Преобразуем связи, заменяя идентификаторы на объекты узлов
  const links = graphData.links.map(link => ({
    source: nodesById[link.source],
    target: nodesById[link.target]
  }));

  // Пересчитываем степени узлов
  const nodeDegrees = {};
  graphData.nodes.forEach(node => {
    nodeDegrees[node.id] = 0;
  });

  links.forEach(link => {
    nodeDegrees[link.source.id] += 1;
    nodeDegrees[link.target.id] += 1;
  });

  // Инициализируем или обновляем симуляцию
  if (!simulation) {
    simulation = d3.forceSimulation()
      .force("link", d3.forceLink().id(d => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));
  } else {
    simulation.force("center", d3.forceCenter(width / 2, height / 2));
  }

  // Обновляем узлы и связи в симуляции
  simulation.nodes(graphData.nodes);
  simulation.force("link").links(links);
  simulation.alpha(1).restart();

  // Добавляем связи
  const link = svg.append("g")
    .attr("class", "links")
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("class", "link");

  // Добавляем узлы
  const node = svg.append("g")
    .attr("class", "nodes")
    .selectAll("g")
    .data(graphData.nodes)
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
}

// Функции для событий мыши
function mouseOver(event, d) {
  // Подсвечиваем узел
  d3.select(this).select("circle").classed("highlighted", true);

  // Подсвечиваем связанные связи
  svg.selectAll(".link")
    .filter(l => l.source.id === d.id || l.target.id === d.id)
    .classed("highlighted", true);

  // Показать тултип
  tooltip.transition()
    .duration(200)
    .style("opacity", .9);
  tooltip.html(d.tooltip || '')
    .style("left", (event.pageX + 10) + "px")
    .style("top", (event.pageY - 28) + "px");
}

function mouseOut(event, d) {
  // Убираем подсветку узла
  d3.select(this).select("circle").classed("highlighted", false);

  // Убираем подсветку связей
  svg.selectAll(".link")
    .filter(l => l.source.id === d.id || l.target.id === d.id)
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

// Функции для интерфейса редактирования
function initializeEditor() {
  const sidebar = document.getElementById('sidebar');
  const nodeList = document.getElementById('nodeList');
  const addNodeButton = document.getElementById('addNodeButton');

  // Отображаем панель редактирования сразу
  sidebar.style.display = 'block';
  populateNodeList();

  // Функция для заполнения списка узлов
  function populateNodeList() {
    nodeList.innerHTML = '';
    graphData.nodes.forEach(node => {
      const nodeItem = document.createElement('div');
      nodeItem.className = 'node-item';
      nodeItem.textContent = node.id;
      nodeItem.addEventListener('click', () => {
        openNodeEditor(node);
      });
      nodeList.appendChild(nodeItem);
    });
  }

  // Обработчик для добавления нового узла
  addNodeButton.addEventListener('click', () => {
    openNodeEditor(null);
  });

  // Функция для открытия редактора узла
  function openNodeEditor(node) {
    // Очистим nodeList и добавим кнопку для возврата к списку
    nodeList.innerHTML = '';

    const backButton = document.createElement('button');
    backButton.textContent = '← Назад';
    backButton.addEventListener('click', () => {
      populateNodeList();
    });
    nodeList.appendChild(backButton);

    // Создаём элементы интерфейса
    const editor = document.createElement('div');
    editor.id = 'nodeEditor';

    const nameGroup = document.createElement('div');
    nameGroup.className = 'input-group';
    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Название узла:';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameGroup.appendChild(nameLabel);
    nameGroup.appendChild(nameInput);

    const tooltipGroup = document.createElement('div');
    tooltipGroup.className = 'input-group';
    const tooltipLabel = document.createElement('label');
    tooltipLabel.textContent = 'Описание (тултип):';
    const tooltipInput = document.createElement('textarea');
    tooltipGroup.appendChild(tooltipLabel);
    tooltipGroup.appendChild(tooltipInput);

    const linksGroup = document.createElement('div');
    linksGroup.className = 'input-group';
    const linksLabel = document.createElement('label');
    linksLabel.textContent = 'Связи с узлами:';
    const linksList = document.createElement('div');
    linksGroup.appendChild(linksLabel);
    linksGroup.appendChild(linksList);

    const addLinkButton = document.createElement('button');
    addLinkButton.className = 'add-link-button';
    addLinkButton.textContent = '+ Добавить связь';

    editor.appendChild(nameGroup);
    editor.appendChild(tooltipGroup);
    editor.appendChild(linksGroup);
    editor.appendChild(addLinkButton);

    nodeList.appendChild(editor);

    let isNewNode = false;

    // Если редактируем существующий узел
    if (node) {
      nameInput.value = node.id;
      tooltipInput.value = node.tooltip || '';

      // Отображаем существующие связи
      displayNodeLinks(node);
    } else {
      // Если создаём новый узел
      node = { id: '', tooltip: '' };
      isNewNode = true;
    }

    // Обработчик изменения названия узла
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        updateNodeId();
        tooltipInput.focus();
        e.preventDefault();
      }
    });

    nameInput.addEventListener('blur', () => {
      updateNodeId();
    });

    function updateNodeId() {
      const oldId = node.id;
      const newId = nameInput.value.trim();

      if (!newId) {
        alert('Название узла не может быть пустым.');
        nameInput.value = oldId;
        return;
      }

      if (oldId !== newId) {
        // Проверяем, есть ли узел с таким названием
        const existingNode = graphData.nodes.find(n => n.id === newId);
        if (existingNode && existingNode !== node) {
          alert('Узел с таким названием уже существует.');
          nameInput.value = oldId;
          return;
        }

        node.id = newId;

        if (isNewNode) {
          // Добавляем узел в graphData.nodes после установки ID
          graphData.nodes.push(node);
          isNewNode = false;
        } else {
          // Обновляем связи с новым id
          graphData.links.forEach(l => {
            if (l.source === oldId) l.source = newId;
            if (l.target === oldId) l.target = newId;
          });
        }

        saveData();
        populateNodeList();
      }
    }

    // Обработчик изменения тултипа
    tooltipInput.addEventListener('input', () => {
      node.tooltip = tooltipInput.value;
      saveData();
    });

    // Обработчик добавления связи
    addLinkButton.addEventListener('click', () => {
      // Список доступных узлов для связи
      const availableNodes = graphData.nodes.filter(n => n.id !== node.id && !graphData.links.some(l => (l.source === node.id && l.target === n.id) || (l.source === n.id && l.target === node.id)));

      if (availableNodes.length === 0) {
        alert('Нет доступных узлов для добавления связи.');
        return;
      }

      const select = document.createElement('select');
      availableNodes.forEach(n => {
        const option = document.createElement('option');
        option.value = n.id;
        option.textContent = n.id;
        select.appendChild(option);
      });

      const confirmButton = document.createElement('button');
      confirmButton.textContent = 'Добавить';
      confirmButton.addEventListener('click', () => {
        const selectedNodeId = select.value;
        graphData.links.push({
          source: node.id,
          target: selectedNodeId
        });
        saveData();
        updateGraph();

        // Обновляем список связей
        displayNodeLinks(node);

        // Удаляем select и кнопку
        editor.removeChild(select);
        editor.removeChild(confirmButton);
      });

      editor.appendChild(select);
      editor.appendChild(confirmButton);
    });

    function displayNodeLinks(node) {
      // Очищаем список связей
      linksList.innerHTML = '';

      // Отображаем существующие связи
      const connectedLinks = graphData.links.filter(l => {
        return l.source === node.id || l.target === node.id;
      });
      const connectedNodes = connectedLinks.map(l => l.source === node.id ? l.target : l.source);

      if (connectedNodes.length > 0) {
        connectedNodes.forEach(n => {
          const linkItemContainer = document.createElement('div');
          linkItemContainer.className = 'link-item';

          const linkItem = document.createElement('span');
          linkItem.textContent = n;

          // Добавляем кнопку для удаления связи
          const removeLinkButton = document.createElement('button');
          removeLinkButton.textContent = 'Удалить связь';
          removeLinkButton.addEventListener('click', () => {
            // Удаляем связь из graphData.links
            graphData.links = graphData.links.filter(l => {
              return !(
                (l.source === node.id && l.target === n) ||
                (l.source === n && l.target === node.id)
              );
            });
            saveData();
            updateGraph();
            // Обновляем список связей
            displayNodeLinks(node);
          });

          linkItemContainer.appendChild(linkItem);
          linkItemContainer.appendChild(removeLinkButton);
          linksList.appendChild(linkItemContainer);
        });
      } else {
        const noLinksMessage = document.createElement('div');
        noLinksMessage.textContent = 'Нет связей.';
        linksList.appendChild(noLinksMessage);
      }
    }
  }
}

// Запускаем загрузку данных и инициализацию
loadData(() => {
  updateGraph();
  initializeEditor();
});
