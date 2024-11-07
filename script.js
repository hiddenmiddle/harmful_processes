// script.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getDatabase, ref, onValue, set, remove, update, get } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";




// Конфигурация Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCJ6HnMh_rgtOXE-ShcPRXNWBmmc61gndA",
  authDomain: "harmfulprocesses.firebaseapp.com",
  databaseURL: "https://harmfulprocesses-default-rtdb.firebaseio.com",
  projectId: "harmfulprocesses",
  storageBucket: "harmfulprocesses.appspot.com",
  messagingSenderId: "532845269952",
  appId: "1:532845269952:web:6d1b028e57a55268742e25",
  measurementId: "G-FB2M6S25G7"
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
// Инициализация Firebase Authentication
const auth = getAuth(app);

// Ссылки на элементы DOM
const sidebar = document.getElementById('sidebar');

// Создание контейнеров для списка узлов и детальной информации
const listView = document.createElement('div');
listView.id = 'nodeListView';

const detailView = document.createElement('div');
detailView.id = 'nodeDetailView';
detailView.style.display = 'none';

// Добавление кнопки "Назад" в detail view
const backButton = document.createElement('button');
backButton.textContent = 'Назад';
backButton.style.marginBottom = '10px';
backButton.onclick = () => {
  detailView.style.display = 'none';
  listView.style.display = 'block';
};
detailView.appendChild(backButton);

// Добавление секции для свойств узла
const nodeProperties = document.createElement('div');
nodeProperties.id = 'nodeProperties';
detailView.appendChild(nodeProperties);

// Добавление секции для связей узла
const nodeLinksContainer = document.createElement('div');
nodeLinksContainer.id = 'nodeLinksContainer';
detailView.appendChild(nodeLinksContainer);

// Добавление секции для добавления связей
const linkSectionTemplate = `
  <h3>Связи</h3>
  <div id="nodeLinkList"></div>
  <div class="input-group">
    <label for="nodeLinkTarget">Добавить связь с:</label>
    <select id="nodeLinkTarget"></select>
  </div>
  <button id="addNodeLinkButton">Добавить связь</button>
`;
const addLinkContainer = document.createElement('div');
addLinkContainer.innerHTML = linkSectionTemplate;
detailView.appendChild(addLinkContainer);

// Добавление контейнеров в sidebar
sidebar.appendChild(listView);
sidebar.appendChild(detailView);

// Ссылки на элементы управления связями в detail view
const nodeLinkListDiv = document.getElementById('nodeLinkList');
const nodeLinkTargetSelect = document.getElementById('nodeLinkTarget');
const addNodeLinkButton = document.getElementById('addNodeLinkButton');

// Создание контейнера для списка узлов
const nodesContainer = document.createElement('div');
nodesContainer.id = 'nodesContainer';
listView.appendChild(nodesContainer);

// Кнопка добавления узла (создается один раз)
const addButton = document.createElement('button');
addButton.id = 'addNodeButton';
addButton.textContent = '+ Добавить узел';
addButton.style.marginTop = '10px';
addButton.style.width = '100%';
addButton.onclick = addNode;
listView.appendChild(addButton);

// Данные графа
let nodes = [];
let links = [];

// Инициализация SVG и D3.js
const svg = d3.select("svg");
const sidebarWidth = 300; // Ширина боковой панели
const width = window.innerWidth - sidebarWidth; // Учитываем ширину sidebar
const height = window.innerHeight;

svg.attr("width", width).attr("height", height);

// Создание групп для связей, узлов и меток
const linkGroup = svg.append("g")
  .attr("class", "links");

const nodeGroup = svg.append("g")
  .attr("class", "nodes");

const labelGroup = svg.append("g")
  .attr("class", "labels");
// Предотвращение появления контекстного меню при правом клике
svg.on("contextmenu", (event) => event.preventDefault());
// Определение поведения масштабирования и панорамирования
const zoom = d3.zoom()
  .scaleExtent([0.5, 5]) // Минимальный и максимальный масштаб
  .on("zoom", zoomed)
  .filter(function(event) {
    // Разрешаем масштабирование двумя пальцами и колесом мыши
    return (event.type === 'wheel' || event.touches && event.touches.length === 2) ||
           // Панорамирование одним пальцем, если касание вне узлов
           (event.type === 'mousedown' || (event.type === 'touchstart' && event.touches.length === 1));
  });

// Применение поведения масштабирования к SVG
svg.call(zoom);

// Функция обработки события масштабирования
function zoomed(event) {
    // Применяем трансформацию к группам узлов, связей и меток
    nodeGroup.attr("transform", event.transform);
    linkGroup.attr("transform", event.transform);
    labelGroup.attr("transform", event.transform);
}

// Получение элементов модального окна
const loginModal = document.getElementById('loginModal');
const closeModal = document.getElementById('closeModal');
const loginButton = document.getElementById('loginButton');
const loginError = document.getElementById('loginError');

// Функция для открытия модального окна
function openLoginModal() {
  loginModal.style.display = "block";
}

// Функция для закрытия модального окна
function closeLogin() {
  loginModal.style.display = "none";
  loginError.textContent = "";
}

// Обработчики событий для открытия и закрытия модального окна
document.getElementById('editButton').addEventListener('click', openLoginModal);
closeModal.addEventListener('click', closeLogin);
window.addEventListener('click', (event) => {
  if (event.target == loginModal) {
    closeLogin();
  }
});

// Обработчик события для кнопки входа
loginButton.addEventListener('click', () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!email || !password) {
    loginError.textContent = "Пожалуйста, введите email и пароль.";
    return;
  }

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      // Вход выполнен успешно
      closeLogin();
      loginError.textContent = "";
    })
    .catch((error) => {
      // Ошибка при входе
      loginError.textContent = "Неверный email или пароль.";
      console.error("Ошибка входа:", error);
    });
});
function logout() {
  signOut(auth).then(() => {
    console.log("Пользователь вышел из системы");
    // Дополнительно можете скрыть интерфейс или обновить состояние
  }).catch((error) => {
    console.error("Ошибка при выходе:", error);
  });
}
window.logout = logout;
// Отслеживание статуса аутентификации пользователя
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Пользователь аутентифицирован
    console.log("Пользователь аутентифицирован");

    // Включаем обработчики для отображения интерфейса только для авторизованного пользователя
    nodeGroup.selectAll("g")
      .on("click", (event, d) => {
        event.stopPropagation();
        openNodeDetail(d.id);
        document.getElementById("sidebar").style.display = "block";
      });

    svg.on("click", () => {
      nodeGroup.selectAll("g")
        .select("circle")
        .classed("highlighted", false);
      linkGroup.selectAll("line")
        .classed("highlighted", false);
      document.getElementById("sidebar").style.display = "none";
    });

  } else {
    // Пользователь не аутентифицирован
    console.log("Пользователь не аутентифицирован");
    openLoginModal();

    // Отключаем обработчики для интерфейса, чтобы он не появлялся для неавторизованных пользователей
    nodeGroup.selectAll("g").on("click", null);
    svg.on("click", null);
  }
});

// Создание симуляции
const simulation = d3.forceSimulation()
  .force("link", d3.forceLink().id(d => d.id).distance(250))
  .force("charge", d3.forceManyBody().strength(-700))
  .force("center", d3.forceCenter(width / 2, height / 2));
// Получаем элементы слайдеров
const linkDistanceSlider = document.getElementById("linkDistanceSlider");
const chargeStrengthSlider = document.getElementById("chargeStrengthSlider");

// Обработчик изменения для link distance
linkDistanceSlider.addEventListener("input", () => {
  const linkDistance = +linkDistanceSlider.value;
  simulation.force("link").distance(linkDistance);
  simulation.alpha(1).restart(); // Перезапуск симуляции
});

// Обработчик изменения для charge strength
chargeStrengthSlider.addEventListener("input", () => {
  const chargeStrength = +chargeStrengthSlider.value;
  simulation.force("charge").strength(chargeStrength);
  simulation.alpha(1).restart(); // Перезапуск симуляции
});

// Создание тултипа
const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

// Функции для событий мыши
function mouseOver(event, d) {
  // Подсвечиваем узел
  d3.select(this).select("circle").classed("highlighted", true);

  // Подсвечиваем связанные связи
  linkGroup.selectAll("line")
    .filter(l => l.source.id === d.id || l.target.id === d.id)
    .classed("highlighted", true);

  // Показать тултип с индивидуальным текстом
  tooltip.transition()
    .duration(200)
    .style("opacity", .9);
  tooltip.html(`<strong>${d.id}</strong><br/>${d.tooltip}`)
    .style("left", (event.pageX + 10) + "px")
    .style("top", (event.pageY - 28) + "px");
    // Находим все связанные узлы
    const connectedNodes = new Set();
    connectedNodes.add(d.id);
    linkGroup.selectAll("line").each(l => {
      if (l.source.id === d.id || l.target.id === d.id) {
        connectedNodes.add(l.source.id);
        connectedNodes.add(l.target.id);
      }
    });

    // Затемняем все несвязанные узлы и связи
    nodeGroup.selectAll("g")
      .classed("dimmed", n => !connectedNodes.has(n.id));

    linkGroup.selectAll("line")
      .classed("dimmed", l => !(l.source.id === d.id || l.target.id === d.id));

    labelGroup.selectAll("text")
      .classed("dimmed", n => !connectedNodes.has(n.id));

    }

function mouseOut(event, d) {
  // Убираем подсветку узла
  d3.select(this).select("circle").classed("highlighted", false);

  // Убираем подсветку связей
  linkGroup.selectAll("line")
    .filter(l => l.source.id === d.id || l.target.id === d.id)
    .classed("highlighted", false);
  // Убираем затемнение со всех узлов и связей
  nodeGroup.selectAll("g").classed("dimmed", false);
  linkGroup.selectAll("line").classed("dimmed", false);
  labelGroup.selectAll("text").classed("dimmed", false);

  // Скрыть тултип
  tooltip.transition()
    .duration(500)
    .style("opacity", 0);
}

// Функция для рендеринга графа
function renderGraph() {
  // Вычисление степени каждого узла
  const degreeMap = {};
  links.forEach(link => {
    degreeMap[link.source] = (degreeMap[link.source] || 0) + 1;
    degreeMap[link.target] = (degreeMap[link.target] || 0) + 1;
  });

  // Обновление узлов с учетом степени
  const updatedNodes = nodes.map(node => ({
    ...node,
    degree: degreeMap[node.id] || 0
  }));

  // Привязка данных для связей
  const formattedLinks = links.map(link => ({
    source: link.source,
    target: link.target
  }));

  const link = linkGroup.selectAll("line")
    .data(formattedLinks, d => `${d.source}-${d.target}`);

  // Удаление старых связей
  link.exit().remove();

  // Добавление новых связей
  const linkEnter = link.enter().append("line")
    .attr("class", "link")
    .attr("stroke-width", 2)
    .on("click", (event, d) => {
      event.stopPropagation();
      if (confirm(`Удалить связь: ${d.source} → ${d.target}?`)) {
        const linkKey = `${d.source}-${d.target}`;
        remove(ref(database, `links/${linkKey}`));
      }
    });

  // Объединение
  link.merge(linkEnter)
    .attr("stroke", "#ACD4EF")
    .attr("stroke-opacity", 0.6);

  // Привязка данных для узлов
  const node = nodeGroup.selectAll("g")
    .data(updatedNodes, d => d.id);

  // Удаление старых узлов
  node.exit().remove();

  // Добавление новых узлов
  const nodeEnter = node.enter().append("g")
    .attr("class", "node")
    .call(d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended))
    .on("mouseover", mouseOver)
    .on("mouseout", mouseOut)
    nodeGroup.selectAll("g")
    .on("click", (event, d) => {
      event.stopPropagation(); // Остановить всплытие события
      openNodeDetail(d.id); // Функция для отображения деталей узла

      // Показать интерфейс
      document.getElementById("sidebar").style.display = "block";
    });

  nodeEnter.append("circle")
    .attr("r", d => 10 + d.degree * 2) // Размер узла зависит от степени
    .attr("fill", "#FDBFF3")
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.5);

  // Объединение
  node.merge(nodeEnter)
    .select("circle")
    .attr("r", d => 10 + d.degree * 2);

  // Привязка данных для меток
  const labels = labelGroup.selectAll("text")
    .data(updatedNodes, d => d.id);

  // Удаление старых меток
  labels.exit().remove();

  // Добавление новых меток
  const labelsEnter = labels.enter().append("text")
    .attr("class", "node-text")
    .attr("dy", -25)
    .attr("text-anchor", "middle")
    .text(d => d.id) // Используем id как имя узла
    .attr("font-size", "12px")
    .attr("fill", "#6E82E5");

  // Объединение
  labels.merge(labelsEnter)
    .text(d => d.id);

  // Запуск симуляции
  simulation
    .nodes(updatedNodes)
    .on("tick", ticked);

  simulation.force("link")
    .links(formattedLinks);

  simulation.alpha(1).restart();
}

// Функция обновления позиций при "тик"
function ticked() {
  linkGroup.selectAll("line")
    .attr("x1", d => d.source.x)
    .attr("y1", d => d.source.y)
    .attr("x2", d => d.target.x)
    .attr("y2", d => d.target.y);

  nodeGroup.selectAll("g")
    .attr("transform", d => `translate(${d.x},${d.y})`);

  labelGroup.selectAll("text")
    .attr("x", d => d.x)
    .attr("y", d => d.y - 25);
}

// Функции для перетаскивания узлов
function dragstarted(event, d) {
  if (!event.active) simulation.alphaTarget(0.3).restart();
  d.fx = d.x;
  d.fy = d.y;
}

function dragged(event, d) {
  d.fx = event.x;
  d.fy = event.y;
}

function dragended(event, d) {
  if (!event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
}

// Функция для загрузки данных из Firebase
function loadData() {
  const nodesRef = ref(database, 'nodes');
  const linksRef = ref(database, 'links');

  // Слушатель изменений узлов
  onValue(nodesRef, snapshot => {
    const data = snapshot.val();
    console.log("Загруженные узлы:", data); // Проверяем данные узлов
    nodes = data ? Object.values(data).map(node => ({
      id: node.id,
      tooltip: node.tooltip
    })) : [];
    updateNodeList();
    updateLinkOptions();
    renderGraph();
  });

  // Слушатель изменений связей
  onValue(linksRef, snapshot => {
    const data = snapshot.val();
    console.log("Загруженные связи:", data); // Проверяем данные связей
    links = data ? Object.values(data).map(link => ({
      source: link.source,
      target: link.target
    })) : [];
    renderGraph();
    updateLinkList();
  });
}

// Функция для обновления списка узлов в интерфейсе (list view)
function updateNodeList() {
  nodesContainer.innerHTML = '';

  nodes.forEach(node => {
    const nodeItem = document.createElement('div');
    nodeItem.className = 'node-item';
    nodeItem.style.display = 'flex';
    nodeItem.style.justifyContent = 'space-between';
    nodeItem.style.alignItems = 'center';
    nodeItem.style.padding = '5px';
    nodeItem.style.borderBottom = '1px solid #FDBFF3';

    const nodeName = document.createElement('span');
    nodeName.textContent = node.id;
    nodeName.style.cursor = 'pointer';
    nodeName.onclick = () => openNodeDetail(node.id);
    nodeItem.appendChild(nodeName);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Удалить';
    deleteBtn.style.backgroundColor = '#f44336';
    deleteBtn.style.color = 'white';
    deleteBtn.style.border = 'none';
    deleteBtn.style.padding = '3px 6px';
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.onclick = (event) => {
      event.stopPropagation(); // Предотвращает всплытие события клика
      deleteNode(node);
    };
    nodeItem.appendChild(deleteBtn);

    nodesContainer.appendChild(nodeItem);
  });
}

// Функция открытия детальной информации узла
function openNodeDetail(nodeId) {
  listView.style.display = 'none';
  detailView.style.display = 'block';
  renderNodeDetail(nodeId);
}

// Функция рендеринга детальной информации узла
function renderNodeDetail(nodeId) {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return;

  nodeProperties.innerHTML = `
    <h3>Свойства узла</h3>
    <div class="input-group">
      <label for="editNodeName">Название узла:</label>
      <input type="text" id="editNodeName" value="${node.id}" class="edit-input">
    </div>
    <div class="input-group">
      <label for="editNodeTooltip">Описание (tooltip):</label>
      <input type="text" id="editNodeTooltip" value="${node.tooltip}" class="edit-input">
    </div>
    <button id="saveNodeButton">Сохранить</button>
  `;

  const saveButton = document.getElementById('saveNodeButton');
  saveButton.onclick = () => {
    const newName = document.getElementById('editNodeName').value.trim();
    const newTooltip = document.getElementById('editNodeTooltip').value.trim();
    if (newName !== node.id) {
      saveNodeName(node.id, newName);
    }
    if (newTooltip !== node.tooltip) {
      saveNodeDescription(node.id, newTooltip);
    }
  };

  // Рендеринг связей узла
  renderNodeLinks(nodeId);
}

// Функция рендеринга связей узла
function renderNodeLinks(nodeId) {
  nodeLinksContainer.innerHTML = '<h4>Связи</h4>';
  nodeLinkListDiv.innerHTML = '';

  const nodeLinks = links.filter(link => link.source === nodeId || link.target === nodeId);

  nodeLinks.forEach(link => {
    const linkItem = document.createElement('div');
    linkItem.className = 'link-item';
    linkItem.style.display = 'flex';
    linkItem.style.justifyContent = 'space-between';
    linkItem.style.alignItems = 'center';
    linkItem.style.marginBottom = '5px';

    const linkText = document.createElement('span');
    linkText.textContent = `${link.source} → ${link.target}`;
    linkItem.appendChild(linkText);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Удалить';
    deleteBtn.style.backgroundColor = '#f44336';
    deleteBtn.style.color = 'white';
    deleteBtn.style.border = 'none';
    deleteBtn.style.padding = '3px 6px';
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.onclick = () => deleteLink(link);
    linkItem.appendChild(deleteBtn);

    nodeLinkListDiv.appendChild(linkItem);
  });

  // Обновление опций для добавления связи
  nodeLinkTargetSelect.innerHTML = '<option value="">-- Выберите цель --</option>';
  nodes.filter(n => n.id !== nodeId).forEach(n => {
    const option = document.createElement('option');
    option.value = n.id;
    option.textContent = n.id;
    nodeLinkTargetSelect.appendChild(option);
  });

  addNodeLinkButton.onclick = () => {
    const targetId = nodeLinkTargetSelect.value;
    if (!targetId) {
      alert("Пожалуйста, выберите цель для связи.");
      return;
    }
    if (targetId === nodeId) {
      alert("Источник и цель не могут быть одинаковыми.");
      return;
    }
    if (links.some(link => (link.source === nodeId && link.target === targetId))) {
      alert("Такая связь уже существует.");
      return;
    }
    const linkKey = `${nodeId}-${targetId}`;
    const newLinkRef = ref(database, `links/${linkKey}`);
    set(newLinkRef, {
      source: nodeId,
      target: targetId
    }).catch(error => console.error("Ошибка при добавлении связи:", error));
  };
}

// Функция для сохранения имени узла
function saveNodeName(oldId, newName) {
  if (newName === "") {
    alert("Название узла не может быть пустым.");
    return;
  }

  // Проверка на уникальность названия
  if (nodes.some(n => n.id.toLowerCase() === newName.toLowerCase() && n.id !== oldId)) {
    alert("Узел с таким названием уже существует.");
    return;
  }

  // Получение данных узла
  const oldNodeRef = ref(database, `nodes/${oldId}`);
  get(oldNodeRef).then(snapshot => {
    if (snapshot.exists()) {
      const nodeData = snapshot.val();

      // Получение всех связей
      const linksRef = ref(database, 'links');
      get(linksRef).then(snapshot => {
        const data = snapshot.val();
        if (data) {
          const updates = {};

          Object.keys(data).forEach(key => {
            if (data[key].source === oldId || data[key].target === oldId) {
              const newSource = data[key].source === oldId ? newName : data[key].source;
              const newTarget = data[key].target === oldId ? newName : data[key].target;
              const newLinkKey = `${newSource}-${newTarget}`;
              // Создание новой связи с новым ключом
              updates[`links/${newLinkKey}`] = { source: newSource, target: newTarget };
              // Удаление старой связи
              updates[`links/${key}`] = null;
            }
          });

          // Удаление старого узла и добавление нового узла с обновленным названием
          updates[`nodes/${oldId}`] = null;
          updates[`nodes/${newName}`] = {
            id: newName,
            tooltip: nodeData.tooltip
          };

          // Выполнение многопутевого обновления
          update(ref(database), updates).then(() => {
            console.log(`Узел "${oldId}" переименован в "${newName}" и связи обновлены.`);
          }).catch(error => {
            console.error("Ошибка при обновлении узла и связей:", error);
          });
        } else {
          // Если связей нет, просто переименовываем узел
          const updates = {};
          updates[`nodes/${oldId}`] = null;
          updates[`nodes/${newName}`] = {
            id: newName,
            tooltip: nodeData.tooltip
          };
          update(ref(database), updates).then(() => {
            console.log(`Узел "${oldId}" переименован в "${newName}".`);
          }).catch(error => {
            console.error("Ошибка при переименовании узла:", error);
          });
        }
      }).catch(error => {
        console.error("Ошибка при получении связей:", error);
      });
    }
  }).catch(error => {
    console.error("Ошибка при получении данных узла:", error);
  });
}

// Функция для сохранения описания узла
function saveNodeDescription(nodeId, newDescription) {
  // Обновление описания узла в Firebase
  const nodeRef = ref(database, `nodes/${nodeId}`);
  update(nodeRef, { tooltip: newDescription }).catch(error => console.error("Ошибка при обновлении описания узла:", error));
}

// Функция для удаления узла и связанных связей
function deleteNode(node) {
  if (!confirm(`Вы уверены, что хотите удалить узел "${node.id}"? Все связанные связи будут удалены.`)) return;

  const updates = {};

  // Удаление узла
  updates[`nodes/${node.id}`] = null;

  // Удаление всех связей, связанных с этим узлом
  links.forEach(link => {
    if (link.source === node.id || link.target === node.id) {
      const linkKey = `${link.source}-${link.target}`;
      updates[`links/${linkKey}`] = null;
    }
  });

  update(ref(database), updates).catch(error => console.error("Ошибка при удалении узла:", error));
}

// Обработчик добавления нового узла
function addNode() {
  const nodeName = prompt("Введите название нового узла:");
  if (!nodeName) return;

  const nodeDescription = prompt("Введите описание для узла (можно оставить пустым):");

  // Проверка на уникальность названия
  if (nodes.some(node => node.id.toLowerCase() === nodeName.trim().toLowerCase())) {
    alert("Узел с таким названием уже существует.");
    return;
  }

  const newNodeRef = ref(database, `nodes/${nodeName.trim()}`);
  set(newNodeRef, {
    id: nodeName.trim(),
    tooltip: nodeDescription ? nodeDescription.trim() : ""
  }).catch(error => console.error("Ошибка при добавлении узла:", error));
}

// Функция для обновления списка связей в интерфейсе (list view)
// Этот участок кода не трогать, так как пользователь отметил его работающим
function updateLinkList() {
  // Placeholder: implement only if necessary
}

// Функция для обновления опций в выпадающих списках связей
// Этот участок кода не трогать, так как пользователь отметил его работающим
function updateLinkOptions() {
  // Placeholder: implement only if necessary
}

// Функция для удаления связи
function deleteLink(link) {
  if (!confirm(`Вы уверены, что хотите удалить связь: ${link.source} → ${link.target}?`)) return;
  const linkKey = `${link.source}-${link.target}`;
  remove(ref(database, `links/${linkKey}`)).catch(error => console.error("Ошибка при удалении связи:", error));
}

// Загрузка данных при инициализации
loadData();

// Обработчик клика вне узлов для сброса выделений и скрытия тултипа
svg.on("click", () => {
  nodeGroup.selectAll("g")
    .select("circle")
    .classed("highlighted", false);

  linkGroup.selectAll("line")
    .classed("highlighted", false);

  hideTooltip();
  // Скрыть интерфейс (боковую панель)
  document.getElementById("sidebar").style.display = "none";
});

// Функции для тултипа
function hideTooltip() {
  tooltip.transition()
    .duration(500)
    .style("opacity", 0);
}
