import styles from './Badge.module.css';

export default function Badge({
    children,
    variant = 'default',
    size = 'md',
    icon: Icon,
    className = '',
    ...props
}) {
    const classes = [
        styles.badge,
        styles[variant],
        styles[size],
        className
    ].filter(Boolean).join(' ');

    return (
        <span className={classes} {...props}>
            {Icon && <Icon size={size === 'sm' ? 12 : 14} />}
            {children}
        </span>
    );
}
