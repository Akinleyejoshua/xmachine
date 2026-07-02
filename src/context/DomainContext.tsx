"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { domainConfigs, DomainConfig } from "@/config/domainConfigs";

// Define the context type
interface DomainContextType {
    activeDomain: DomainConfig;
    setActiveDomain: (domainId: string) => void;
}

// Create the context
const DomainContext = createContext<DomainContextType | undefined>(undefined);

// Provider component
interface DomainProviderProps {
    children: ReactNode;
}

export const DomainProvider: React.FC<DomainProviderProps> = ({ children }) => {
    const [activeDomain, setActiveDomain] = useState<DomainConfig>(domainConfigs["time-series"]);

    const updateActiveDomain = (domainId: string) => {
        if (domainConfigs[domainId]) {
            setActiveDomain(domainConfigs[domainId]);
        } else {
            console.warn(`Domain configuration for ${domainId} not found.`);
        }
    };

    return (
        <DomainContext.Provider value={{ activeDomain, setActiveDomain: updateActiveDomain }}>
            {children}
        </DomainContext.Provider>
    );
};

// Custom hook to use the domain context
export const useDomain = () => {
    const context = useContext(DomainContext);
    if (!context) {
        throw new Error("useDomain must be used within a DomainProvider");
    }
    return context;
};