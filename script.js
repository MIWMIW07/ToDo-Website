// To-Do List Application Script
        // Get references to HTML elements
        const taskInput = document.getElementById('taskInput');
        const taskDate = document.getElementById('taskDate');
        const taskTime = document.getElementById('taskTime');
        const taskDueDate = document.getElementById('taskDueDate');
        const reminderTime = document.getElementById('reminderTime');
        const addBtn = document.getElementById('addBtn');
        const taskList = document.getElementById('taskList');
        const weekFilter = document.getElementById('weekFilter');
        const totalTasksEl = document.getElementById('totalTasks');
        const activeTasksEl = document.getElementById('activeTasks');
        const completedTasksEl = document.getElementById('completedTasks');
        const notificationEl = document.getElementById('notification');
        const notificationBody = document.getElementById('notificationBody');

        // Set default dates to today
        const today = new Date();
        taskDate.value = today.toISOString().split('T')[0];
        taskDueDate.value = today.toISOString().split('T')[0];

        // Load tasks from memory when page loads
        let tasks = [];
        let selectedWeek = 0; // 0 = current week
        let notificationTimeout;
        loadTasks();
        generateWeekTabs();
        checkReminders(); // Check reminders on load
        setInterval(checkReminders, 60000); // Check every minute

        // Add task when button is clicked
        addBtn.addEventListener('click', addTask);

        // Add task when Enter key is pressed
        taskInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addTask();
            }
        });

        // Function to show notification
        function showNotification(message, type = 'info') {
            notificationBody.textContent = message;
            notificationEl.className = 'notification show ' + type;
            
            // Auto-hide after 10 seconds
            clearTimeout(notificationTimeout);
            notificationTimeout = setTimeout(() => {
                closeNotification();
            }, 10000);
        }

        // Function to close notification
        function closeNotification() {
            notificationEl.classList.remove('show');
        }

        // Function to check reminders
        function checkReminders() {
            const now = new Date();
            
            tasks.forEach(task => {
                if (task.completed || !task.reminderTime) return;
                
                // Check if it's time for reminder
                const reminderDateTime = new Date(task.date + 'T' + task.reminderTime);
                const timeDiff = reminderDateTime - now;
                
                // Remind if within 1 minute
                if (timeDiff > 0 && timeDiff < 60000) {
                    showNotification(`Reminder: ${task.text}`, 'warning');
                }
                
                // Check for overdue tasks
                if (task.dueDate) {
                    const dueDateTime = new Date(task.dueDate + 'T23:59:59');
                    if (now > dueDateTime && !task.notifiedOverdue) {
                        showNotification(`Overdue: ${task.text} was due on ${formatDate(task.dueDate)}`, 'danger');
                        task.notifiedOverdue = true;
                        saveTasks();
                    }
                }
                
                // Check for tasks due today
                if (task.dueDate && isDueToday(task.dueDate) && !task.notifiedDueToday) {
                    showNotification(`Due Today: ${task.text} is due today!`, 'warning');
                    task.notifiedDueToday = true;
                    saveTasks();
                }
            });
        }

        // Function to generate week tabs
        function generateWeekTabs() {
            weekFilter.innerHTML = '';
            
            // Generate tabs for current week and next 3 weeks
            for (let i = 0; i < 4; i++) {
                const tab = document.createElement('div');
                tab.className = 'week-tab';
                if (i === selectedWeek) {
                    tab.classList.add('active');
                }
                
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() + (i * 7));
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                
                if (i === 0) {
                    tab.textContent = 'This Week';
                } else {
                    tab.textContent = `Week ${i + 1} (${formatDateShort(weekStart)} - ${formatDateShort(weekEnd)})`;
                }
                
                tab.onclick = () => filterByWeek(i);
                weekFilter.appendChild(tab);
            }
        }

        // Function to filter tasks by week
        function filterByWeek(weekIndex) {
            selectedWeek = weekIndex;
            generateWeekTabs();
            displayTasks();
        }

        // Function to format date (short version)
        function formatDateShort(date) {
            const month = date.toLocaleString('default', { month: 'short' });
            const day = date.getDate();
            return `${month} ${day}`;
        }

        // Function to format date for display
        function formatDate(dateStr) {
            const date = new Date(dateStr);
            const options = { month: 'short', day: 'numeric', year: 'numeric' };
            return date.toLocaleDateString('en-US', options);
        }

        // Function to format time for display
        function formatTime(timeStr) {
            if (!timeStr) return '';
            const [hours, minutes] = timeStr.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour % 12 || 12;
            return `${displayHour}:${minutes} ${ampm}`;
        }

        // Function to check if date is today
        function isToday(dateStr) {
            const taskDate = new Date(dateStr);
            const today = new Date();
            return taskDate.toDateString() === today.toDateString();
        }

        // Function to check if due date is today
        function isDueToday(dateStr) {
            const dueDate = new Date(dateStr);
            const today = new Date();
            return dueDate.toDateString() === today.toDateString();
        }

        // Function to check if due date is within 2 days
        function isDueSoon(dateStr) {
            const dueDate = new Date(dateStr);
            const now = new Date();
            const twoDaysFromNow = new Date();
            twoDaysFromNow.setDate(now.getDate() + 2);
            return dueDate > now && dueDate <= twoDaysFromNow;
        }

        // Function to check if overdue
        function isOverdue(dateStr) {
            const dueDate = new Date(dateStr + 'T23:59:59');
            const now = new Date();
            return dueDate < now;
        }

        // Function to check if task is in selected week
        function isInSelectedWeek(dateStr) {
            const taskDate = new Date(dateStr);
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() + (selectedWeek * 7));
            weekStart.setHours(0, 0, 0, 0);
            
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);
            
            return taskDate >= weekStart && taskDate <= weekEnd;
        }

        // Function to add a new task
        function addTask() {
            const taskText = taskInput.value.trim();
            const dateValue = taskDate.value;
            const timeValue = taskTime.value;
            const dueDateValue = taskDueDate.value;
            const reminderValue = reminderTime.value;
            
            // Check if input is empty
            if (taskText === '') {
                alert('Please enter a task!');
                return;
            }

            // Check if date is provided
            if (dateValue === '') {
                alert('Please select a start date!');
                return;
            }

            // Validate due date is after start date
            if (dueDateValue && new Date(dueDateValue) < new Date(dateValue)) {
                alert('Due date cannot be before start date!');
                return;
            }

            // Create task object
            const task = {
                id: Date.now(), // Unique ID using timestamp
                text: taskText,
                date: dateValue,
                time: timeValue,
                dueDate: dueDateValue,
                reminderTime: reminderValue,
                completed: false,
                notifiedOverdue: false,
                notifiedDueToday: false,
                createdAt: new Date().toISOString()
            };

            // Add to tasks array
            tasks.push(task);

            // Clear input
            taskInput.value = '';
            taskTime.value = '';
            reminderTime.value = '';

            // Save and display
            saveTasks();
            displayTasks();
            updateStats();
            
            // Show success notification
            showNotification(`Task "${taskText}" added successfully!`, 'info');
        }

        // Function to display all tasks
        function displayTasks() {
            // Clear current list
            taskList.innerHTML = '';

            // Filter tasks by selected week
            const filteredTasks = tasks.filter(task => isInSelectedWeek(task.date));

            // Sort tasks by date and time
            filteredTasks.sort((a, b) => {
                const dateA = new Date(a.date + 'T' + (a.time || '00:00'));
                const dateB = new Date(b.date + 'T' + (b.time || '00:00'));
                return dateA - dateB;
            });

            // Show empty state if no tasks
            if (filteredTasks.length === 0) {
                taskList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📋</div>
                        <div class="empty-state-text">No tasks for this week</div>
                        <div class="empty-state-subtext">Add a task above to get started</div>
                    </div>
                `;
                return;
            }

            // Create HTML for each task
            filteredTasks.forEach(task => {
                const li = document.createElement('li');
                li.className = 'task-item';
                
                // Determine task status
                if (task.completed) {
                    li.classList.add('completed');
                } else if (task.dueDate && isOverdue(task.dueDate)) {
                    li.classList.add('overdue');
                } else if (task.dueDate && isDueSoon(task.dueDate)) {
                    li.classList.add('due-soon');
                } else if (isToday(task.date)) {
                    li.classList.add('today');
                }

                const timeDisplay = task.time ? `<span class="datetime-badge">🕐 ${formatTime(task.time)}</span>` : '';
                const dueDateDisplay = task.dueDate ? `<span class="datetime-badge due-date">📅 Due: ${formatDate(task.dueDate)}</span>` : '';
                const reminderDisplay = task.reminderTime ? `<span class="datetime-badge reminder">🔔 ${formatTime(task.reminderTime)}</span>` : '';

                li.innerHTML = `
                    <div class="task-checkbox" onclick="toggleComplete(${task.id})"></div>
                    <div class="task-content">
                        <div class="task-text">${task.text}</div>
                        <div class="task-datetime">
                            <span class="datetime-badge">📅 Start: ${formatDate(task.date)}</span>
                            ${timeDisplay}
                            ${dueDateDisplay}
                            ${reminderDisplay}
                        </div>
                    </div>
                    <div class="task-buttons">
                        <button class="delete-btn" onclick="deleteTask(${task.id})">
                            Delete
                        </button>
                    </div>
                `;

                taskList.appendChild(li);
            });
        }

        // Function to update statistics
        function updateStats() {
            const total = tasks.length;
            const completed = tasks.filter(t => t.completed).length;
            const active = total - completed;

            totalTasksEl.textContent = total;
            activeTasksEl.textContent = active;
            completedTasksEl.textContent = completed;
        }

        // Function to toggle task completion
        function toggleComplete(id) {
            const task = tasks.find(t => t.id === id);
            if (task) {
                task.completed = !task.completed;
                saveTasks();
                displayTasks();
                updateStats();
            }
        }

        // Function to delete a task
        function deleteTask(id) {
            if (confirm('Are you sure you want to delete this task?')) {
                tasks = tasks.filter(t => t.id !== id);
                saveTasks();
                displayTasks();
                updateStats();
            }
        }

        // Function to save tasks to browser memory
        function saveTasks() {
            const tasksJSON = JSON.stringify(tasks);
            // Store in browser (persists even after closing)
            // Note: This uses in-memory storage for the demo
            window.savedTasks = tasksJSON;
        }

        // Function to load tasks from browser memory
        function loadTasks() {
            const savedData = window.savedTasks;
            if (savedData) {
                tasks = JSON.parse(savedData);
                displayTasks();
                updateStats();
            }
        }
