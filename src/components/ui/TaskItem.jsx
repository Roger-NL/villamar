import { useState } from 'react';
import styles from './TaskItem.module.css';
import { Check, Camera, Image } from 'lucide-react';

export default function TaskItem({
    task,
    onToggle,
    onPhotoUpload,
    showPhotoOption = true
}) {
    const [showPhotoInput, setShowPhotoInput] = useState(false);

    const handleToggle = () => {
        if (onToggle) onToggle(task.id);
    };

    const handlePhotoClick = () => {
        setShowPhotoInput(true);
    };

    return (
        <div className={`${styles.taskItem} ${task.completed ? styles.completed : ''}`}>
            <button
                className={styles.checkbox}
                onClick={handleToggle}
                aria-label={task.completed ? 'Marcar como não feito' : 'Marcar como feito'}
            >
                {task.completed && <Check size={16} />}
            </button>

            <div className={styles.content}>
                <span className={styles.title}>{task.title}</span>
                {task.time && (
                    <span className={styles.time}>{task.time}</span>
                )}
                {task.description && (
                    <span className={styles.description}>{task.description}</span>
                )}
            </div>

            {showPhotoOption && (
                <div className={styles.actions}>
                    {task.photo ? (
                        <span className={styles.photoIndicator}>
                            <Image size={16} />
                        </span>
                    ) : (
                        <button
                            className={styles.photoButton}
                            onClick={handlePhotoClick}
                            aria-label="Enviar foto"
                        >
                            <Camera size={18} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
