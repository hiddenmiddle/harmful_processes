// Инициализация Firebase
const app = firebase.initializeApp(firebaseConfig);
const database = firebase.database(app);

// Переменные для данных графа и симуляции
let graphData = { nodes: [], links: [] };
let simulation;

// Функция для загрузки данных из Firebase
function loadDataFromFirebase(callback) {
  const nodesRef = database.ref('nodes');
  const linksRef = database.ref('links');

  nodesRef.once('value', snapshot => {
    const nodesData = snapshot.val();
    if (nodesData) {
      graphData.nodes = nodesData;
    }
    linksRef.once('value', snapshot => {
      const linksData = snapshot.val();
      if (linksData) {
        graphData.links = linksData;
      }
      prepareData();
      callback();
    });
  }).catch(error => {
    console.error('Ошибка загрузки из Firebase:', error);
  });
}

// Функция для подготовки данных
function prepareData() {
  graphData.nodes.forEach(node => {
    node.id = String(node.id);
    node.tooltip = node.tooltip || '';
  });

  graphData.links.forEach(link => {
    link.source = String(typeof link.source === 'object' ? link.source.id : link.source);
    link.target = String(typeof link.target === 'object' ? link.target.id : link.target);
  });
}

// Функция для сохранения данных в Firebase
function saveDataToFirebase() {
  const nodesRef = database.ref('nodes');
  const linksRef = database.ref('links');

  nodesRef.set(graphData.nodes, (error) => {
    if (error) {
      console.error('Ошибка сохранения узлов в Firebase:', error);
    } else {
      console.log('Узлы успешно сохранены в Firebase.');
    }
  });

  linksRef.set(graphData.links, (error) => {
    if (error) {
      console.error('Ошибка сохранения связей в Firebase:', error);
    } else {
      console.log('Связи успешно сохранены в Firebase.');
    }
  });
}

// Функция для обновления графа
function updateGraph() {
  const svg = d3.select("svg")
    .attr("width", "100%")
    .attr("height", "100%");

  svg.selectAll("*").remove();  // Очищаем предыдущие элементы

  const width = svg.node().clientWidth;
  const height = svg.node().clientHeight;

  const nodesById = {};
  graphData.nodes.forEach(node => {
    nodesById[node.id] = node;
  });

  const links = graphData.links.map(link => ({
    source: nodesById[link.source],
    target: nodesById[link.target]
  }));

  const nodeDegrees = {};
  graphData.nodes.forEach(node => {
    nodeDegrees[node.id] = 0;
  });

  links.forEach(link => {
    nodeDegrees[link.source.id] += 1;
    nodeDegrees[link.target.id] += 1;
  });

  if (!simulation) {
    simulation = d3.forceSimulation()
      .force("link", d3.forceLink().id(d => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));
  } else {
    simulation.force("center", d3.forceCenter(width / 2, height / 2));
  }

  simulation.nodes(graphData.nodes);
  simulation.force("link").links(links);
  simulation.alpha(1).restart();

  const link = svg.append("g")
    .attr("class", "links")
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("class", "link");

  const node = svg.append("g")
    .attr("class", "nodes")
    .selectAll("g")
    .data(graphData.nodes)
    .join("g")
    .attr("class", "node")
    .call(drag(simulation));

  node.append("circle")
    .attr("r", d => 10 + (nodeDegrees[d.id] || 0) * 5);

  node.append("text")
    .attr("dx", d => 12 + (nodeDegrees[d.id] || 0) * 5)
    .attr("dy", 4)
    .text(d => d.id)
    .attr("class", "node-text");

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

// Функция для добавления нового узла
function addNode(newNode) {
  if (!graphData.nodes.find(node => node.id === newNode.id)) {
    graphData.nodes.push(newNode);
    saveDataToFirebase();  // Сохраняем данные в Firebase
    updateGraph();  // Обновляем граф
  } else {
    alert('Узел с таким именем уже существует!');
  }
}

// Функция для добавления новой связи
function addLink(sourceId, targetId) {
  if (!graphData.links.find(link => link.source === sourceId && link.target === targetId)) {
    graphData.links.push({ source: sourceId, target: targetId });
    saveDataToFirebase();  // Сохраняем данные в Firebase
    updateGraph();  // Обновляем граф
  } else {
    alert('Такая связь уже существует!');
  }
}

// Обработчик добавления нового узла из интерфейса
document.getElementById('addNodeButton').addEventListener('click', () => {
  const newNodeId = prompt('Введите имя нового узла:');
  if (newNodeId) {
    const newNode = { id: newNodeId, tooltip: `Описание для ${newNodeId}` };
    addNode(newNode);
  }
});

// Загрузка данных из Firebase и инициализация графа и редактора
loadDataFromFirebase(() => {
  updateGraph();
  initializeEditor();
});
