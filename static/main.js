const messagesArea = document.getElementById("messagesArea");
const chatContainer = document.getElementById("chatContainer");
const userTagInput = document.getElementById("userTagInput");
const profileButton = document.getElementById("profileButton");
const settingsModal = document.getElementById("settingsModal");
const closeModal = document.getElementById("closeModal");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const languageSelect = document.getElementById("languageSelect");
const settingsHeader = document.getElementById("settingsHeader");
const usernameInput = document.getElementById("usernameInput");
const usernameError = document.getElementById("usernameError");
const languageLabel = document.getElementById("languageLabel");
const logoutButton = document.getElementById("logoutButtonProfile");
const errorTag = document.getElementById("errorTag");
const avatarDisplay = document.getElementById("avatarDisplay");
const avatarInput = document.getElementById("avatarInput");
const saveSettingsButton = document.getElementById('saveSettingsButton');
const chatButton = document.getElementById("chatButton"); // Переменная для кнопки чата
const searchButton = document.getElementById("searchButton"); // Переменная для кнопки поиска
const activeChatsContainer = document.getElementById("activeChatsContainer"); // Новый контейнер для активных чатов
const lockButton = document.querySelector(".lock-button");
const lockMessageModal = document.getElementById("lockMessageModal");
const closeLockModal = document.getElementById("closeLockModal");
const confirmLockButton = document.getElementById("confirmLockButton");
const cancelLockButton = document.getElementById("cancelLockButton");



let socket;
let userId; 
let userEmail; 
let userPassword; 
let token;
let logs = [];
let username;
let receiverId;
let language;



function initWebSocket() {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        console.log('WebSocket уже в состоянии открытия или соединения.');
        return;
    }

    socket = new WebSocket("ws://0.0.0.0:8080/ws");
    sessionStorage.setItem('mainPageOpen', 'true');


    socket.onopen = function() {
        console.log("Соединение WebSocket установлено");
        username123();
    };


    socket.onmessage = function(event) {
        const data = JSON.parse(event.data);
        console.log("Received data:", data);
        handleServerMessage(data);
    };

    socket.onclose = function(event) {
        if (event.wasClean) {
            console.log(`Соединение закрыто чисто, код=${event.code} причина=${event.reason}`);
        } else {
            console.log('Соединение закрыто, пытаюсь переподключиться...');
            setTimeout(initWebSocket, 5000);
        }
    };

    socket.onerror = function(error) {
        console.error("Ошибка WebSocket:", error.message || error);
    };
}


function handleServerMessage(data) {
    console.log("Received data:", data);

    // Проверяем, есть ли токен в ответе сервера
    if (data.token) {
        token = data.token; // Обновляем токен, если сервер его отправляет
        sessionStorage.setItem('token', token);
    }

    if (data.type === 'messageSent') {
        console.log('Сообщение отправлено:', data.message);
    } else if (data.type === 'userList') {
        updateUserList(data.users);
    } else if (data.status === 'error') {
        console.error("Ошибка:", data.message);
        alert(data.message); // Показываем сообщение об ошибке пользователю
    } else if (data.status === 'success') {
        if (data.command === 'login' || data.command === 'register') {
            userId = data.user_id; // Устанавливаем userId
            username = data.username;
            sessionStorage.setItem('userId', userId);
            console.log('Успешный вход/регистрация, userId установлен:', userId);
            alert(`Вы успешно ${data.command === 'login' ? 'вошли' : 'зарегистрировались'} в систему!`);
            loadUserSettings(); // Загрузка пользовательских настроек после входа
        } else if (data.command === 'settingsSaved') {
            alert('Настройки успешно сохранены!');
        } else if (data.command === 'searchResult') {
            console.log("Результаты поиска:", data.users); // Логируем результаты поиска
            displaySearchResults(data.users); // Отображаем результаты поиска
        } else if (data.command === 'startChat') {
            console.log('Чат начат с пользователем:', data.user); // Логируем начало чата
            // Здесь вы можете обновить интерфейс чата, показать историю сообщений и т.д.
        } else if (data.command === 'chatList') {
            // Обрабатываем полученные чаты
            if (Array.isArray(data.chats) && data.chats.length > 0) {
                console.log('Вызов функции displayActiveChats с чатом:', data.chats);
                displayActiveChats(data.chats); // Отображаем все активные чаты
            } else {
                console.log('Нет активных чатов для отображения.');
                console.log('Ошибка получения чатов:', data.message);
            }
        } else if (data.command === 'messages') {
            console.log('Загрузка чата успешно');
            displayMessages(data.messages, data.sender);
            const messages = data.messages;
            messages.forEach(msg => {
                console.log(`Сообщение от ${msg.sender} к ${msg.receiver}: ${msg.text} (время: ${msg.timestamp})`);
            });
        } else if (data.command === 'username') {
            username = data.username;
            language = data.language;
            console.log('username =', username, "laungauge", language);
            loadActiveChats(); 
            changeLanguage(language);
        } else if (data.command === 'loadSettengs') {
            console.log("loadsettings")
            changeLanguage(data);
        }
    }

    // Обработка юзернейма
    if (data.command === 'usernameExists') {
        usernameError.innerText = "Юзернейм уже занят."; // Показать ошибку
        usernameError.style.display = "block"; // Убедимся, что ошибка видна
        console.log("Юзернейм занят:", data.username);
    } else if (data.command === 'usernameNotFound') {
        usernameError.innerText = ""; // Очистить сообщение об ошибке
        usernameError.style.display = "none"; // Скрыть ошибку
        console.log("Юзернейм доступен.");
    }

    // Если есть другие данные о пользователе
    if (data.username) {
        username = data.username;
        handleLoadSettings(data); // Обработка пользовательских настроек
    }

    console.log('Текущий userId:', userId);
}


sendButton.addEventListener("click", function (event) {
    event.preventDefault();
    console.log("Button pressed");
    const message = messageInput.value.trim();
    if (message) {
        const data = {
            command: "sendMessage",
            user_id: username,
            receiver: receiverId,
            text: message,
    }
    socket.send(JSON.stringify(data));
    messageInput.value = '';
    };})



function username123() {
    console.log(userId);
    socket.send(JSON.stringify({ command: 'getusername', user_id: userId }));
    console.log('запрос юзернейма');
}




// Функция для отображения результатов поиска
function displaySearchResults(users) { 
    userSearchResults.innerHTML = ''; // Очищаем предыдущие результаты
    const limitedUsers = users.slice(0, 4); // Берем только первые 4 пользователя

    // Получаем значение из userTagInput
    const userTagInput = document.getElementById("userTagInput").value; // Предполагаем, что у вас есть элемент с id "userTagInput"

    if (limitedUsers.length > 0) {
        // Скрываем кнопки чатов, если есть результаты
        document.getElementById("activeChatsContainer").style.display = "none";
        
        limitedUsers.forEach(user => {
            const userDiv = document.createElement("div"); // Создаем div для каждого пользователя
            userDiv.className = "user-result"; // Примените свой стиль

            // Создаем кнопку для пользователя, только если имя пользователя не совпадает с текущим
            if (user.username !== username) {
                const userButton = document.createElement("button");
                userButton.className = "user-button"; // Примените свой стиль
                userButton.onclick = () => selectUser(user.username); // Добавляем обработчик клика

                // Создаем аватар
                const avatarImg = document.createElement("img");
                avatarImg.src = user.avatar; // Предполагается, что у пользователя есть поле avatar с URL
                avatarImg.alt = `${user.username}'s avatar`; // Подсказка для изображения
                avatarImg.className = "user-avatar"; // Примените стиль для аватара

                // Создаем элемент для имени пользователя
                const usernameSpan = document.createElement("span");
                usernameSpan.innerText = user.username; // Устанавливаем текст кнопки
                usernameSpan.className = "user-name"; // Примените стиль для текста

                // Добавляем аватар и текст внутрь кнопки
                userButton.appendChild(avatarImg);
                userButton.appendChild(usernameSpan);

                // Добавляем кнопку в div пользователя
                userDiv.appendChild(userButton);
            }

            // Добавляем div в блок результатов поиска
            userSearchResults.appendChild(userDiv);
        });
    } else {
        // Если нет результатов и userTagInput пустое, показываем кнопки чатов
        if (!userTagInput.trim()) {
            document.getElementById("activeChatsContainer").style.display = "block";
        }
    }
}




// Обновленная функция для отображения активных чатов
function displayActiveChats(chats) {
    const activeChatsContainer = document.getElementById("activeChatsContainer");
    const chatArea = document.querySelector(".chat-area"); // Область чата
    const chatList = document.querySelector(".chat-list"); // Список чатов
    const header = document.querySelector(".header"); // Шапка
    const profileButton = document.getElementById("profileButton"); // Кнопка профиля

    activeChatsContainer.innerHTML = '';

    chats.forEach(chat => {
        const chatDiv = document.createElement("div");
        chatDiv.className = "user-result";

        const chatButton = document.createElement("button");
        chatButton.className = "user-button";

        const avatarImg = document.createElement("img");
        avatarImg.src = chat.avatar || "default-avatar.png";
        avatarImg.alt = `${chat.username}'s avatar`;
        avatarImg.className = "user-avatar";

        const usernameSpan = document.createElement("span");
        usernameSpan.innerText = chat.username;
        usernameSpan.className = "user-name";

        chatButton.appendChild(avatarImg);
        chatButton.appendChild(usernameSpan);
        chatDiv.appendChild(chatButton);
        activeChatsContainer.appendChild(chatDiv);

        // Добавляем обработчик клика для открытия чата
        chatButton.addEventListener('click', (event) => {
            event.preventDefault();
            receiverId = chat.username; // Устанавливаем receiverId
            console.log(`Receiver ID установлен на: ${receiverId}`); // Лог для отладки
            loadChatMessages(chat.username);

            // На мобильных устройствах скрываем список чатов и показываем область чата
            if (window.innerWidth <= 768) {
                chatList.style.display = "none";  // Скрываем список чатов
                chatArea.style.display = "flex";  // Показываем область чата
                
                // Убираем кнопку профиля и добавляем кнопку "Назад"
                profileButton.style.display = "none"; // Скрываем кнопку профиля

                // Добавляем кнопку "Назад" в шапку
                if (!document.getElementById("backButton")) {
                    const backButton = document.createElement("button");
                    backButton.id = "backButton";
                    backButton.innerText = "← Назад";
                    backButton.className = "back-button"; // Класс для стилизации кнопки
                    header.appendChild(backButton); // Добавляем кнопку в шапку

                    // Обработчик для кнопки "Назад"
                    backButton.addEventListener('click', () => {
                        chatList.style.display = "block"; // Показываем список чатов
                        chatArea.style.display = "none";  // Скрываем область чата
                        profileButton.style.display = "block"; // Возвращаем кнопку профиля
                        backButton.remove(); // Удаляем кнопку "Назад" после возврата
                    });
                }
            }
        });
    });

    activeChatsContainer.style.display = "block";
}


function loadChatMessages(chatWith) {
    const token = sessionStorage.getItem('token');  
    if (!token) {
        console.error('Необходима авторизация');
        return;
    }

    if (!username) {
        console.error('Нема юзернейма');
        return
    }

    socket.send(JSON.stringify({ command: 'getMessages', chatWith: chatWith, user_id: username, token: token }));
    console.log('chatWith=', chatWith, "Username =", username);
    console.log('Отправка получения чатов на сервер отправленна');
}


function displayMessages(messages) {
    const messagesArea = document.getElementById("messagesArea");
    messagesArea.innerHTML = '';  // Очищаем старые сообщения

    messages.forEach(msg => {
        const messageDiv = document.createElement("div");
        messageDiv.className = "message";

        const senderSpan = document.createElement("span");
        senderSpan.className = "sender";
        // Отображаем "Вы" для своих сообщений, иначе имя отправителя
        senderSpan.innerText = msg.sender === username ? "" : `${msg.sender}: `;

        const textSpan = document.createElement("span");
        textSpan.className = "message-text";
        textSpan.innerText = msg.text;

        // Форматируем время
        const timestamp = new Date(msg.timestamp); // Предполагаем, что timestamp — это строка в формате "YYYY-MM-DD HH:mm:ss"
        const hours = String(timestamp.getHours()).padStart(2, '0');
        const minutes = String(timestamp.getMinutes()).padStart(2, '0');
        const timeSpan = document.createElement("span");
        timeSpan.className = "message-time"; // Примените свой стиль для времени
        timeSpan.innerText = `${hours}:${minutes}`; // Формат времени "HH:MM"

        if (msg.sender === username) {
            messageDiv.classList.add("my-message"); // Добавляем класс для отправленных сообщений
        }

        // Создаем контейнер для кнопок
        const buttonsContainer = document.createElement("div");
        buttonsContainer.className = "buttons-container"; // Примените свой стиль

        // Если сообщение отправлено через блокировку, добавляем кнопки, если не вы отправитель
        if (msg.text === "Пользователь предложил сменить шифрование (RSA)" && msg.sender !== username) {
            const lockButton = document.createElement("button");
            lockButton.className = "message-button"; // Примените свой стиль
            lockButton.innerText = "Поменять"; // Текст кнопки
            lockButton.onclick = function() {
                smenashifrovaniaRSA(receiverId);
            };

            const cancelButton = document.createElement("button");
            cancelButton.className = "message-button1"; // Примените свой стиль
            cancelButton.innerText = "Предложить другой тип шифрования"; // Текст второй кнопки
            cancelButton.onclick = function() {
                cancelLockButton.click();
            };

            buttonsContainer.appendChild(lockButton);
            buttonsContainer.appendChild(cancelButton);
        }

        // Если сообщение отправлено через блокировку, добавляем кнопки, если не вы отправитель
        if (msg.text === "Пользователь предложил сменить шифрование (AES)" && msg.sender !== username) {
            const lockButton = document.createElement("button");
            lockButton.className = "message-button"; // Примените свой стиль
            lockButton.innerText = "Поменять"; // Текст кнопки
            lockButton.onclick = function() {
                smenashifrovaniaAES(receiverId);
            };

            const cancelButton = document.createElement("button");
            cancelButton.className = "message-button1"; // Примените свой стиль
            cancelButton.innerText = "Предложить другой тип шифрования"; // Текст второй кнопки
            cancelButton.onclick = function() {
                confirmLockButton.click();
            };

            buttonsContainer.appendChild(lockButton);
            buttonsContainer.appendChild(cancelButton);
        }

        // Добавляем элементы в сообщение
        messageDiv.appendChild(senderSpan);
        messageDiv.appendChild(textSpan);
        messageDiv.appendChild(timeSpan); // Добавляем время сообщения
        messageDiv.appendChild(buttonsContainer); // Добавляем контейнер кнопок

        messagesArea.appendChild(messageDiv); // Добавляем новое сообщение в область сообщений
    });
}






// Обновление списка пользователей
function updateUserList(users) {
    chatContainer.innerHTML = '';
    users.forEach(user => {
        const userElement = document.createElement("div");
        userElement.className = "chat";
        userElement.innerText = user; // Убедитесь, что это значение имеет символ '@'
        userElement.onclick = () => selectUser(user);
        chatContainer.appendChild(userElement);
        console.log(`Добавлен пользователь: ${user}`); // Лог для отладки
    });
}


// Выбор пользователя
function selectUser(user) {
    console.log(`Выбрано: ${user}`);
    console.log('Текущий токен:', token);

    // Очищаем поле поиска и результаты
    userTagInput.value = '';
    userSearchResults.innerHTML = '';
    chatButton.style.display = 'none'; // Скрыть кнопку чата

    if (!token) {
        console.error("Токен отсутствует. Нельзя начать чат.");
        return;
    }

    // Логика для начала чата
    console.log(`Начинаем чат с пользователем: ${user}`);

    // Отправляем запрос на сервер для создания чата
    socket.send(JSON.stringify({ 
        command: 'startChat', 
        user: user, 
        user_id: username,
    }));

    // Отправка данных о чате на сервер для сохранения
    fetch('/chats/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ user_id_1: userId, user_id_2: user })
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => { throw new Error(text); }); // Обработка текста ответа
        }
        return response.json(); // Если ответ корректный, парсим JSON
    })
    .then(data => {
        console.log('Чат сохранен на сервере:', data);
        displayActiveChats([user]); // Добавляем пользователя в активные чаты
    })
    .catch(error => {
        console.error('Ошибка при сохранении чата:', error);
    });

    // Добавляем лог для подтверждения отправки
    console.log(`Запрос на старт чата с пользователем ${user} отправлен на сервер.`);
}




// Поиск пользователя
function searchUser() {
    const query = userTagInput.value.toLowerCase().trim(); // Удаляем лишние пробелы

    // Условие, чтобы не производить поиск, если поле ввода пустое
    if (query.length === 0) {
        userSearchResults.innerHTML = ''; // Очищаем результаты поиска
        chatButton.style.display = 'none'; // Скрываем кнопку
        return; // Возвращаемся, чтобы не продолжать выполнение
    }

    // Логируем только если query не пустое
    console.log(`Поиск пользователя с тегом: ${query}`);

    // Условие, чтобы искать только если тег начинается с '@' и содержит более одного символа
    if (!query.startsWith('@') || query.length <= 1) {
        userSearchResults.innerHTML = ''; // Очищаем результаты поиска
        chatButton.style.display = 'none'; // Скрываем кнопку, если тег неверный
        return;
    }

    // Отправка запроса на сервер для поиска пользователя
    socket.send(JSON.stringify({ command: 'searchUser', tag: query }));

    // Здесь можно сбросить результаты поиска, если хотите
    userSearchResults.innerHTML = ''; // Очищаем предыдущие результаты
}





// Проверка тега пользователя
userTagInput.oninput = function(event) {
    const userTag = userTagInput.value.trim(); // Удаляем лишние пробелы
    event.preventDefault();

    // Проверяем, пустое ли поле
    if (userTag.length === 0) {
        errorTag.innerText = ""; // Очищаем текст ошибки
        userSearchResults.innerHTML = ''; // Очищаем результаты поиска
        chatButton.style.display = 'none'; // Скрываем кнопку
        document.getElementById("activeChatsContainer").style.display = "block"; // Показываем контейнер активных чатов
        return; // Завершаем выполнение функции
    }

    // Проверяем, начинается ли тег с '@'
    if (!userTag.startsWith('@')) {
        console.log("Ошибка в теге пользователя: тег должен начинаться с '@'.");
        errorTag.innerText = "Ошибка: тег должен начинаться с '@'."; // Отображаем ошибку
        userSearchResults.innerHTML = ''; // Очищаем результаты поиска
        chatButton.style.display = 'none'; // Скрываем кнопку
        return; // Завершаем выполнение функции
    }

    // Если все проверки пройдены, очищаем текст ошибки и запускаем поиск
    errorTag.innerText = ""; // Очищаем текст ошибки
    searchUser(); // Запускаем поиск пользователя при вводе
};



usernameInput.oninput = function(event) {
    event.preventDefault();
    const username = usernameInput.value.trim(); // Убираем лишние пробелы

    // Если поле ввода пустое, показываем активные чаты
    if (username === '') {
        displayActiveChats(currentChats); // `currentChats` - это ваши текущие активные чаты
        usernameError.style.display = "none"; // Скрываем ошибку, если поле пустое
        return;
    }

    // Проверяем, начинается ли юзернейм с символа @
    if (!username.startsWith('@')) {
        usernameError.innerText = "Юзернейм должен начинаться с '@'.";
        usernameError.style.display = "block";
        return;
    }

    // Проверяем, достаточно ли длинный юзернейм
    if (username.length < 2) {
        usernameError.innerText = "Юзернейм должен содержать как минимум 2 символа.";
        usernameError.style.display = "block";
        return;
    }

    // Скрываем сообщение об ошибке при корректном юзернейме
    usernameError.innerText = "";
    usernameError.style.display = "none";

    // Отправляем запрос на сервер для проверки уникальности юзернейма
    socket.send(JSON.stringify({ command: 'checkUsername', username: username }));
};




// Открытие модального окна
profileButton.onclick = function() {
    console.log('Проверка userId перед открытием окна:', userId);
    if (userId) {
        settingsModal.style.display = "block";
        loadUserSettings();
    } else {
        console.log('User ID не установлен, окно не откроется.');
    }
};


// Закрытие модального окна
closeModal.onclick = function() {
    settingsModal.style.display = "none";
};

// Закрытие модального окна по клику вне его
window.onclick = function(event) {
    if (event.target === settingsModal) {
        settingsModal.style.display = "none";
    }
};

// Отображение аватара
avatarDisplay.onclick = function() {
    avatarInput.click();
};

// Загрузка аватара
avatarInput.onchange = function(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        avatarDisplay.src = e.target.result;
        avatarDisplay.style.display = "block";
    };
    reader.readAsDataURL(file);
};

// Изменение языка
languageSelect.onchange = function() {
    changeLanguage(language);
};

logoutButton.onclick = function() {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("userId"); // Удаление userId при выходе
    sessionStorage.removeItem('mainPageOpen'); // Удаление других данных, если необходимо
    userId = null;
    window.location.href = "oform.html";
};

// Сохранение настроек
saveSettingsButton.onclick = function() {
    saveSettings();
};

// Сохранение настроек профиля
function saveSettings() {
    const username = usernameInput.value;
    const language = languageSelect.value;
    const avatar = avatarDisplay.src;

    if (!username || !language) {
        alert("Пожалуйста, заполните все поля.");
        return;
    }

    const settingsData = {
        username: username,
        language: language,
        avatar: avatar
    };

    socket.send(JSON.stringify({ command: 'saveSettings', user_id: userId, settings: settingsData }));
    settingsModal.style.display = "none"; // Закрыть модальное окно
}

// Загрузка настроек пользователя
function loadUserSettings() {
    if (!userId) {
        console.error("User ID не установлен.");
        return;
    }
    socket.send(JSON.stringify({ command: 'loadSettings', user_id: userId }));
}

// Обработка ответа сервера при загрузке настроек
function handleLoadSettings(data) {
    usernameInput.value = data.username || "";
    languageSelect.value = data.language || "";
    lang = data.language;
    avatarDisplay.src = data.avatar || "";
    console.log("Загружаем настройки", lang)
    changeLanguage(lang);

}


// Функция для загрузки профиля
async function fetchProfile() {
    const response = await fetch('/profile', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (response.status === 401) {
        // Если токен истёк, перенаправляем пользователя на страницу входа
        alert("Ваш сеанс истёк. Пожалуйста, войдите в систему снова.");
        window.location.href = "oform.html"; // Перенаправление на страницу входа
    }
}

// Получение активных чатов
function loadActiveChats() {
    socket.send(JSON.stringify({ command: 'getChats', user_id: username, token: token }));
    console.log('Отправка запроса на получение чатов с user_id:', username);
}


// Открытие модального окна при нажатии на кнопку блокировки
lockButton.addEventListener("click", function() {
    lockMessageModal.style.display = "block";
});

// Закрытие модального окна при нажатии на "x"
closeLockModal.addEventListener("click", function() {
    lockMessageModal.style.display = "none";
});

// Закрытие модального окна при нажатии на "Отменить"
cancelLockButton.addEventListener("click", function() {
    // Отправка статического сообщения
    const message = {
        command: "sendMessage",
        user_id: username,
        receiver: receiverId, // Здесь должен быть получатель
        text: "Пользователь предложил сменить шифрование (AES)" // Статическое сообщение
    };
    
    socket.send(JSON.stringify(message)); // Отправка сообщения через WebSocket
    console.log("Сообщение заблокировано: Отправлено сообщение"); // Пример логирования
    
    // Добавляем новое сообщение в область сообщений
    const messagesArea = document.getElementById("messagesArea");
    const messageDiv = document.createElement("div");
    messageDiv.className = "message";

    const senderSpan = document.createElement("span");
    senderSpan.className = "sender";
    senderSpan.innerText = `${username}: `; // Отправитель

    const textSpan = document.createElement("span");
    textSpan.className = "message-text";
    textSpan.innerText = "Отправлено сообщение"; // Статическое сообщение

    // Создаем контейнер для кнопок
    const buttonsContainer = document.createElement("div");
    buttonsContainer.className = "buttons-container"; // Примените свой стиль

    // Создаем первую кнопку
    const lockButton = document.createElement("button");
    lockButton.className = "message-button"; // Примените свой стиль
    lockButton.innerText = "Заблокировать"; // Текст кнопки
    lockButton.onclick = function() {
        // Логика для заблокированного сообщения
        console.log("Сообщение заблокировано:", textSpan.innerText);
    };

    // Создаем вторую кнопку
    const cancelButton = document.createElement("button");
    cancelButton.className = "message-button"; // Примените свой стиль
    cancelButton.innerText = "Отменить"; // Текст второй кнопки
    cancelButton.onclick = function() {
        console.log("Действие отменено"); // Логика для отмены действия
    };

    // Добавляем кнопки в контейнер
    buttonsContainer.appendChild(lockButton);
    buttonsContainer.appendChild(cancelButton);

    // Добавляем элементы в сообщение
    messageDiv.appendChild(senderSpan);
    messageDiv.appendChild(textSpan);
    messageDiv.appendChild(buttonsContainer); // Добавляем контейнер кнопок

    messagesArea.appendChild(messageDiv); // Добавляем новое сообщение в область сообщений
    lockMessageModal.style.display = "none"; // Закрытие модального окна
});

// Обработка нажатия на "Да, заблокировать"
confirmLockButton.addEventListener("click", function() {
    // Отправка статического сообщения
    const message = {
        command: "sendMessage",
        user_id: username,
        receiver: receiverId, // Здесь должен быть получатель
        text: "Пользователь предложил сменить шифрование (RSA)" // Статическое сообщение
    };
    
    socket.send(JSON.stringify(message)); // Отправка сообщения через WebSocket
    console.log("Сообщение заблокировано: Отправлено сообщение"); // Пример логирования
    
    // Добавляем новое сообщение в область сообщений
    const messagesArea = document.getElementById("messagesArea");
    const messageDiv = document.createElement("div");
    messageDiv.className = "message";

    const senderSpan = document.createElement("span");
    senderSpan.className = "sender";
    senderSpan.innerText = `${username}: `; // Отправитель

    const textSpan = document.createElement("span");
    textSpan.className = "message-text";
    textSpan.innerText = "Отправлено сообщение"; // Статическое сообщение

    // Создаем контейнер для кнопок
    const buttonsContainer = document.createElement("div");
    buttonsContainer.className = "buttons-container"; // Примените свой стиль

    // Создаем первую кнопку
    const lockButton = document.createElement("button");
    lockButton.className = "message-button"; // Примените свой стиль
    lockButton.innerText = "Заблокировать"; // Текст кнопки
    lockButton.onclick = function() {
        // Логика для заблокированного сообщения
        console.log("Сообщение заблокировано:", textSpan.innerText);
    };

    // Создаем вторую кнопку
    const cancelButton = document.createElement("button");
    cancelButton.className = "message-button"; // Примените свой стиль
    cancelButton.innerText = "Отменить"; // Текст второй кнопки
    cancelButton.onclick = function() {
        console.log("Действие отменено"); // Логика для отмены действия
    };

    // Добавляем кнопки в контейнер
    buttonsContainer.appendChild(lockButton);
    buttonsContainer.appendChild(cancelButton);

    // Добавляем элементы в сообщение
    messageDiv.appendChild(senderSpan);
    messageDiv.appendChild(textSpan);
    messageDiv.appendChild(buttonsContainer); // Добавляем контейнер кнопок

    messagesArea.appendChild(messageDiv); // Добавляем новое сообщение в область сообщений
    lockMessageModal.style.display = "none"; // Закрытие модального окна
});



// Закрытие модального окна при нажатии вне его
window.addEventListener("click", function(event) {
    if (event.target == lockMessageModal) {
        lockMessageModal.style.display = "none";
    }
});



function smenashifrovaniaAES(chatWith) {
    console.log(username, chatWith);
    socket.send(JSON.stringify({ command: 'AES', user_id: username, chatWith: chatWith }));
}

function smenashifrovaniaRSA(chatWith) {
    console.log(username, chatWith);
    socket.send(JSON.stringify({ command: 'RSA', user_id: username, chatWith: chatWith }));
}




// Инициализация WebSocket 
window.onload = function() {
    userId = sessionStorage.getItem('userId'); 
    token = sessionStorage.getItem('token'); 
    console.log('Токен загружен:', token);
    initWebSocket();
    fetchProfile(); // Загружаем профиль при загрузке страницы
    
};
