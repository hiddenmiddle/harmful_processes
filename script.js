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
    loadLocalData(callback);  // Если Firebase пуст или ошибка, загрузим данные из JSON
  });
}

// Функция для загрузки данных из локального JSON
function loadLocalData(callback) {
  d3.json("graphData.json").then(data => {
    graphData = data;
    prepareData();
    saveDataToFirebase();  // Сохраняем данные в Firebase после их загрузки
    callback();
  }).catch(error => {
    console.error('Ошибка загрузки локальных данных:', error);
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
  svg.selectAll("*").remove();

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
    .on("mouseover", mouseOver)
    .on("mouseout", mouseOut)
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

// Функции для событий мыши
function mouseOver(event, d) {
  d3.select(this).select("circle").classed("highlighted", true);
  svg.selectAll(".link")
    .filter(l => l.source.id === d.id || l.target.id === d.id)
    .classed("highlighted", true);

  tooltip.transition()
    .duration(200)
    .style("opacity", .9);
  tooltip.html(d.tooltip || '')
    .style("left", (event.pageX + 10) + "px")
    .style("top", (event.pageY - 28) + "px");
}

function mouseOut(event, d) {
  d3.select(this).select("circle").classed("highlighted", false);
  svg.selectAll(".link")
    .filter(l => l.source.id === d.id || l.target.id === d.id)
    .classed("highlighted", false);

  tooltip.transition()
    .duration(500)
    .style("opacity", 0);
}

// Функции для интерфейса редактирования и сохранения в Firebase
function initializeEditor() {
  const sidebar = document.getElementById('sidebar');
  const nodeList = document.getElementById('nodeList');
  const addNodeButton = document.getElementById('addNodeButton');

  sidebar.style.display = 'block';
  populateNodeList();

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

  addNodeButton.addEventListener('click', () => {
    openNodeEditor(null);
  });

  function openNodeEditor(node) {
    nodeList.innerHTML = '';

    const backButton = document.createElement('button');
    backButton.textContent = '← Назад';
    backButton.addEventListener('click', () => {
      populateNodeList();
    });
    nodeList.appendChild(backButton);

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

    if (node) {
      nameInput.value = node.id;
      tooltipInput.value = node.tooltip || '';
      displayNodeLinks(node);
    } else {
      node = { id: '', tooltip: '' };
      isNewNode = true;
    }

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
        const existingNode = graphData.nodes.find(n => n.id === newId);
        if (existingNode && existingNode !== node) {
          alert('Узел с таким названием уже существует.');
          nameInput.value = oldId;
          return;
        }

        node.id = newId;

        if (isNewNode) {
          graphData.nodes.push(node);
          isNewNode = false;
        } else {
          graphData.links.forEach(l => {
            if (l.source === oldId) l.source = newId;
            if (l.target === oldId) l.target = newId;
          });
        }

        saveDataToFirebase();  // Сохраняем данные в Firebase
        populateNodeList();
      }
    }

    tooltipInput.addEventListener('input', () => {
      node.tooltip = tooltipInput.value;
      saveDataToFirebase();  // Сохраняем данные в Firebase
    });

    addLinkButton.addEventListener('click', () => {
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
        saveDataToFirebase();  // Сохраняем данные в Firebase
        updateGraph();
        displayNodeLinks(node);

        editor.removeChild(select);
        editor.removeChild(confirmButton);
      });

      editor.appendChild(select);
      editor.appendChild(confirmButton);
    });

    function displayNodeLinks(node) {
      linksList.innerHTML = '';
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

          const removeLinkButton = document.createElement('button');
          removeLinkButton.textContent = 'Удалить связь';
          removeLinkButton.addEventListener('click', () => {
            graphData.links = graphData.links.filter(l => !(l.source === node.id && l.target === n) && !(l.source === n && l.target === node.id));
            saveDataToFirebase();  // Сохраняем данные в Firebase
            updateGraph();
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
loadDataFromFirebase(() => {
  updateGraph();
  initializeEditor();
});
