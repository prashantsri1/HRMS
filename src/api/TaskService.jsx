// src/api/taskService.js

import { db } from '../Firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'; 

/**
 * 💡 Admin/HR dwara naya task assign karna.
 * Saath hi Employee ko notification bhejna.
 * * @param {Object} taskData - { title, description, priority, dueDate, assignedToId, assignedToName }
 * @param {Object} assigner - { uid, name, role } (Jo task de raha hai)
 */
export const assignNewTask = async (taskData, assigner) => {
    try {
        // 1. Prepare Task Object
        const newTask = {
            title: taskData.title,
            description: taskData.description || '',
            priority: taskData.priority || 'Medium', // Low, Medium, High
            
            assignedToId: taskData.assignedToId,
            assignedToName: taskData.assignedToName || 'Employee',
            
            status: 'Pending', // Initial status
            
            // 🔍 Audit Trail (Kisne task diya)
            createdBy: assigner.uid,
            createdByName: assigner.name || 'Admin',
            createdByRole: assigner.role,
            
            dueDate: taskData.dueDate || null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        
        // 2. Save to 'tasks' collection
        const taskRef = await addDoc(collection(db, "tasks"), newTask); 
        
        // 3. 🔥 Send Notification to Employee
        // Agar task kisi aur ko diya hai (Self-assign nahi hai), toh notify karo
        if (taskData.assignedToId !== assigner.uid) {
            await addDoc(collection(db, "notifications"), {
                recipientId: taskData.assignedToId,
                senderId: assigner.uid,
                senderName: assigner.name,
                
                title: "New Task Assigned 📋",
                message: `You have been assigned a new task: "${taskData.title}" by ${assigner.name}`,
                
                type: "task_assigned", // For icon logic
                link: "/employee/my-tasks", // Click karke kahan jana hai
                relatedId: taskRef.id, // Task ID link karne ke liye
                
                isRead: false,
                createdAt: serverTimestamp()
            });
        }

        return true;

    } catch (error) {
        console.error("Task Assignment Error:", error);
        throw new Error("Failed to assign task. Please try again.");
    }
};

/**
 * 💡 Task Update (Status Change / Comment)
 * Note: Use generic useFirestore hook for simple updates, 
 * but use this if complex logic (like notifying Admin on completion) is needed.
 */
export const completeTask = async (taskId, employeeName, adminId) => {
    // Ye future implementation ke liye hai agar
    // employee ke complete karne par Admin ko notification bhejna ho.
};