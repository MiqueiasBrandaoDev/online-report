'use client';

import React from 'react';
import styles from '../Report.module.css';

export type TabType = 'dashboard' | 'transcricoes';

interface TabsProps {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
}

export default function Tabs({ activeTab, onTabChange }: TabsProps) {
    return (
        <div className={styles.tabsContainer}>
            <button
                className={`${styles.tab} ${activeTab === 'dashboard' ? styles.tabActive : ''}`}
                onClick={() => onTabChange('dashboard')}
            >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                </svg>
                Dashboard
            </button>
            <button
                className={`${styles.tab} ${activeTab === 'transcricoes' ? styles.tabActive : ''}`}
                onClick={() => onTabChange('transcricoes')}
            >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                </svg>
                Transcrições
            </button>
        </div>
    );
}
