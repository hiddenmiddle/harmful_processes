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

// Переменные для данных графа
let graphData;

// Функция для загрузки данных
function loadData(callback) {
  // Проверяем, есть ли данные в localStorage
  const storedData = localStorage.getItem('graphData');
  if (storedData) {
    graphData = JSON.parse(storedData);
    callback();
  } else {
    // Загружаем данные из JSON-файла
    d3.json("graphData.json").then(data => {
      graphData = data;
      callback();
    }).catch(error => {
      console.error('Error loading or parsing data:', error);
    });
  }
}

// Функция для сохранения данных в localStorage
function saveData() {
  localStorage.setItem('graphData', JSON.stringify(graphData));
  // Перерисовываем граф
  updateGraph();
}

// Функция для обновления графа
function updateGraph() {
  svg.selectAll("*").remove();

  // Вычисляем степень каждого узла (количество связей)
  const nodeDegrees = {};
  graphData.links.forEach(link => {
    nodeDegrees[link.source] = (nodeDegrees[link.source] || 0) + 1;
    nodeDegrees[link.target] = (nodeDegrees[link.target] || 0) + 1;
  });

  // Создаём симуляцию
  const simulation = d3.forceSimulation(graphData.nodes)
    .force("link", d3.forceLink(graphData.links).id(d => d.id).distance(150))
    .force("charge", d3.forceManyBody().strength(-300))
    .force("center", d3.forceCenter(width / 2, height / 2));

  // Добавляем связи
  const link = svg.append("g")
    .attr("class", "links")
    .selectAll("line")
    .data(graphData.links)
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
}

// Функции для интерфейса редактирования
function initializeEditor() {
  const editButton = document.getElementById('editButton');
  const passwordModal = document.getElementById('passwordModal');
  const passwordInput = document.getElementById('passwordInput');
  const passwordSubmit = document.getElementById('passwordSubmit');
  const sidebar = document.getElementById('sidebar');
  const nodeList = document.getElementById('nodeList');
  const addNodeButton = document.getElementById('addNodeButton');

  // Пароль (замените на безопасный метод в реальном приложении)
  const correctPassword = 'your_secure_password';

  // Обработчик нажатия на кнопку Edit
  editButton.addEventListener('click', () => {
    passwordModal.style.display = 'block';
  });

  // Обработчик нажатия на кнопку Войти
  passwordSubmit.addEventListener('click', () => {
    const enteredPassword = passwordInput.value;
    if (enteredPassword === correctPassword) {
      passwordModal.style.display = 'none';
      passwordInput.value = '';
      sidebar.style.display = 'block';
      populateNodeList();
    } else {
      alert('Неверный пароль');
    }
  });

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

    // Если редактируем существующий узел
    if (node) {
      nameInput.value = node.id;
      tooltipInput.value = node.tooltip;

      // Отображаем существующие связи
      const connectedNodes = graphData.links
        .filter(l => l.source === node.id || l.target === node.id)
        .map(l => l.source === node.id ? l.target : l.source);

      connectedNodes.forEach(n => {
        const linkItem = document.createElement('div');
        linkItem.textContent = n;
        linksList.appendChild(linkItem);
      });
    }

    // Обработчик изменения названия узла
    nameInput.addEventListener('input', () => {
      if (node) {
        node.id = nameInput.value;
        saveData();
        populateNodeList();
      }
    });

    // Обработчик изменения тултипа
    tooltipInput.addEventListener('input', () => {
      if (node) {
        node.tooltip = tooltipInput.value;
        saveData();
      }
    });

    // Обработчик добавления связи
    addLinkButton.addEventListener('click', () => {
      const availableNodes = graphData.nodes.filter(n => n.id !== node.id);
      const nodeOptions = availableNodes.map(n => n.id);

      const select = document.createElement('select');
      nodeOptions.forEach(optionText => {
        const option = document.createElement('option');
        option.value = optionText;
        option.textContent = optionText;
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

        // Добавляем в список связей
        const linkItem = document.createElement('div');
        linkItem.textContent = selectedNodeId;
        linksList.appendChild(linkItem);

        // Удаляем select и кнопку
        select.remove();
        confirmButton.remove();
      });

      editor.appendChild(select);
      editor.appendChild(confirmButton);
    });

    // Очищаем sidebar и добавляем редактор узла
    nodeList.innerHTML = '';
    nodeList.appendChild(editor);
  }
}

// Запускаем загрузку данных и инициализацию
loadData(() => {
  updateGraph();
  initializeEditor();
});
