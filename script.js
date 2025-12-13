// To-Do List Application Script
(function() {
    'use strict';
    
    // Constants
    const REMINDER_CHECK_INTERVAL = 60000; // 1 minute
    const NOTIFICATION_AUTO_HIDE = 10000; // 10 seconds
    const REMINDER_WINDOW = 60000; // 1 minute window for reminders

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

    // Application state
    let tasks = [];
    let selectedWeek = 0;
    let notificationTimeout;
    let editingTaskId = null;
    let notifiedReminders = new Set(); // Track which reminders have been shown

    // Initialize app
    loadTasks();
    generateWeekTabs();
    checkReminders();
    setInterval(checkReminders, REMINDER_CHECK_INTERVAL);

    // Event listeners
    addBtn.addEventListener('click', handleAddOrUpdateTask);
    taskInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleAddOrUpdateTask();
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Escape to cancel editing
        if (e.key === 'Escape' && editingTaskId) {
            cancelEdit();
        }
    });

    // Function to sanitize HTML input
    function sanitizeHTML(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }

    // Function to show notification
    function showNotification(message, type = 'info') {
        notificationBody.textContent = message;
        notificationEl.className = 'notification show ' + type;
        
        clearTimeout(notificationTimeout);
        notificationTimeout = setTimeout(() => {
            closeNotification();
        }, NOTIFICATION_AUTO_HIDE);
    }

    // Function to close notification
    function closeNotification() {
        notificationEl.classList.remove('show');
    }

    // Make closeNotification available globally for onclick handler
    window.closeNotification = closeNotification;

    // Function to check reminders
    function checkReminders() {
        const now = new Date();
        
        tasks.forEach(task => {
            if (task.completed || !task.reminderTime) return;
            
            const taskDateObj = new Date(task.date + 'T' + task.reminderTime);
            const reminderKey = `${task.id}-${task.reminderTime}`;
            
            // Check if reminder hasn't been shown yet
            if (notifiedReminders.has(reminderKey)) return;
            
            // Check if it's time for reminder (within the window)
            const timeDiff = taskDateObj - now;
            
            if (timeDiff > 0 && timeDiff < REMINDER_WINDOW) {
                showNotification(`Reminder: ${task.text}`, 'warning');
                notifiedReminders.add(reminderKey);
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
        const currentDate = new Date(); // Use current date, not cached 'today'
        
        for (let i = 0; i < 4; i++) {
            const tab = document.createElement('div');
            tab.className = 'week-tab';
            if (i === selectedWeek) {
                tab.classList.add('active');
            }
            
            const weekStart = new Date(currentDate);
            weekStart.setDate(currentDate.getDate() + (i * 7));
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
        const currentDate = new Date(); // Use current date
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() + (selectedWeek * 7));
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        return taskDate >= weekStart && taskDate <= weekEnd;
    }

    // Function to validate task inputs
    function validateTask(taskText, dateValue, dueDateValue, timeValue, reminderValue) {
        if (taskText === '') {
            showNotification('Please enter a task!', 'danger');
            return false;
        }

        if (dateValue === '') {
            showNotification('Please select a start date!', 'danger');
            return false;
        }

        // Validate due date is after start date
        if (dueDateValue && new Date(dueDateValue) < new Date(dateValue)) {
            showNotification('Due date cannot be before start date!', 'danger');
            return false;
        }

        // Validate reminder time logic
        if (reminderValue && timeValue) {
            const startDateTime = new Date(dateValue + 'T' + timeValue);
            const reminderDateTime = new Date(dateValue + 'T' + reminderValue);
            
            if (reminderDateTime > startDateTime) {
                showNotification('Reminder time should be before or at task start time!', 'danger');
                return false;
            }
        }

        // Warn if reminder is set without task time
        if (reminderValue && !timeValue) {
            showNotification('Task time is recommended when setting a reminder', 'warning');
        }

        return true;
    }

    // Function to handle add or update task
    function handleAddOrUpdateTask() {
        const taskText = taskInput.value.trim();
        const dateValue = taskDate.value;
        const timeValue = taskTime.value;
        const dueDateValue = taskDueDate.value;
        const reminderValue = reminderTime.value;
        
        if (!validateTask(taskText, dateValue, dueDateValue, timeValue, reminderValue)) {
            return;
        }

        if (editingTaskId) {
            // Update existing task
            const task = tasks.find(t => t.id === editingTaskId);
            if (task) {
                task.text = sanitizeHTML(taskText);
                task.date = dateValue;
                task.time = timeValue;
                task.dueDate = dueDateValue;
                task.reminderTime = reminderValue;
                task.notifiedOverdue = false;
                task.notifiedDueToday = false;
                
                showNotification(`Task "${taskText}" updated successfully!`, 'info');
                cancelEdit();
            }
        } else {
            // Create new task
            const task = {
                id: Date.now(),
                text: sanitizeHTML(taskText),
                date: dateValue,
                time: timeValue,
                dueDate: dueDateValue,
                reminderTime: reminderValue,
                completed: false,
                notifiedOverdue: false,
                notifiedDueToday: false,
                createdAt: new Date().toISOString()
            };

            tasks.push(task);
            showNotification(`Task "${taskText}" added successfully!`, 'info');
        }

        // Clear inputs
        taskInput.value = '';
        taskTime.value = '';
        reminderTime.value = '';

        saveTasks();
        displayTasks();
        updateStats();
    }

    // Function to edit a task
    function editTask(id) {
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        editingTaskId = id;
        taskInput.value = task.text;
        taskDate.value = task.date;
        taskTime.value = task.time || '';
        taskDueDate.value = task.dueDate || '';
        reminderTime.value = task.reminderTime || '';

        addBtn.textContent = 'Update Task';
        addBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        taskInput.focus();
        
        showNotification('Editing task - press Escape to cancel', 'info');
    }

    // Make editTask available globally
    window.editTask = editTask;

    // Function to cancel editing
    function cancelEdit() {
        editingTaskId = null;
        taskInput.value = '';
        taskTime.value = '';
        reminderTime.value = '';
        addBtn.textContent = 'Add Task';
        addBtn.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
    }

    // Function to display all tasks
    function displayTasks() {
        taskList.innerHTML = '';

        const filteredTasks = tasks.filter(task => isInSelectedWeek(task.date));

        filteredTasks.sort((a, b) => {
            const dateA = new Date(a.date + 'T' + (a.time || '00:00'));
            const dateB = new Date(b.date + 'T' + (b.time || '00:00'));
            return dateA - dateB;
        });

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

        filteredTasks.forEach(task => {
            const li = document.createElement('li');
            li.className = 'task-item';
            li.setAttribute('data-task-id', task.id);
            
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
                <div class="task-checkbox" onclick="toggleComplete(${task.id})" role="button" aria-label="Mark task as ${task.completed ? 'incomplete' : 'complete'}" tabindex="0"></div>
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
                    <button class="edit-btn" onclick="editTask(${task.id})" aria-label="Edit task">
                        Edit
                    </button>
                    <button class="delete-btn" onclick="deleteTask(${task.id})" aria-label="Delete task">
                        Delete
                    </button>
                </div>
            `;

            // Add keyboard support for checkbox
            const checkbox = li.querySelector('.task-checkbox');
            checkbox.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    window.toggleComplete(task.id);
                }
            });

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
            
            if (task.completed) {
                showNotification(`Task "${task.text}" completed! 🎉`, 'info');
            }
        }
    }

    // Make toggleComplete available globally
    window.toggleComplete = toggleComplete;

    // Function to delete a task
    function deleteTask(id) {
        const task = tasks.find(t => t.id === id);
        if (!task) return;
        
        if (confirm(`Are you sure you want to delete "${task.text}"?`)) {
            tasks = tasks.filter(t => t.id !== id);
            
            // Clear editing state if deleting the task being edited
            if (editingTaskId === id) {
                cancelEdit();
            }
            
            saveTasks();
            displayTasks();
            updateStats();
            showNotification('Task deleted', 'info');
        }
    }

    // Make deleteTask available globally
    window.deleteTask = deleteTask;

    // Function to save tasks
    function saveTasks() {
        try {
            const tasksJSON = JSON.stringify(tasks);
            window.savedTasks = tasksJSON;
        } catch (error) {
            console.error('Error saving tasks:', error);
            showNotification('Error saving tasks', 'danger');
        }
    }

    // Function to load tasks
    function loadTasks() {
        try {
            const savedData = window.savedTasks;
            if (savedData) {
                tasks = JSON.parse(savedData);
                displayTasks();
                updateStats();
            }
        } catch (error) {
            console.error('Error loading tasks:', error);
            showNotification('Error loading tasks. Starting fresh.', 'danger');
            tasks = [];
        }
    }
})();
