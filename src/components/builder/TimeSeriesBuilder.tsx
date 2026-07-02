"use client";

import React, { useState } from "react";
import { useDomain } from "@/context/DomainContext";

const TimeSeriesBuilder: React.FC = () => {
    const { activeDomain } = useDomain();
    const [selectedArchitecture, setSelectedArchitecture] = useState<string>(activeDomain.modules.modelBuilder.architectures[0].id);
    const [hyperparameters, setHyperparameters] = useState<Record<string, string | number>>({});

    const selectedArch = activeDomain.modules.modelBuilder.architectures.find(
        (arch) => arch.id === selectedArchitecture
    );

    const handleHyperparameterChange = (label: string, value: string | number) => {
        setHyperparameters({
            ...hyperparameters,
            [label]: value,
        });
    };

    return (
        <div className="p-6 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Time-Series Model Builder</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                Select an architecture and configure hyperparameters for your time-series model.
            </p>

            <div className="mb-6">
                <label className="block mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Architecture
                </label>
                <select
                    className="w-full p-2 border border-neutral-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                    value={selectedArchitecture}
                    onChange={(e) => setSelectedArchitecture(e.target.value)}
                >
                    {activeDomain.modules.modelBuilder.architectures.map((arch) => (
                        <option key={arch.id} value={arch.id}>
                            {arch.name}
                        </option>
                    ))}
                </select>
            </div>

            {selectedArch && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <h3 className="text-lg font-medium mb-2">{selectedArch.name}</h3>
                        <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                            {selectedArch.description}
                        </p>
                    </div>
                    {selectedArch.hyperparameters.map((param) => (
                        <div key={param.label} className="flex flex-col">
                            <label className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                {param.label}
                            </label>
                            {param.type === "select" && (
                                <select
                                    className="p-2 border border-neutral-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                                    value={hyperparameters[param.label] as string || param.defaultValue as string}
                                    onChange={(e) => handleHyperparameterChange(param.label, e.target.value)}
                                >
                                    {param.options?.map((option) => (
                                        <option key={typeof option === "string" ? option : option.value} value={typeof option === "string" ? option : option.value}>
                                            {typeof option === "string" ? option : option.label}
                                        </option>
                                    ))}
                                </select>
                            )}
                            {param.type === "number" && (
                                <input
                                    type="number"
                                    className="p-2 border border-neutral-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                                    value={hyperparameters[param.label] as number || param.defaultValue as number}
                                    onChange={(e) => handleHyperparameterChange(param.label, Number(e.target.value))}
                                    min={param.min}
                                    max={param.max}
                                />
                            )}
                            {param.type === "slider" && (
                                <div className="flex flex-col">
                                    <input
                                        type="range"
                                        className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                                        value={hyperparameters[param.label] as number || param.defaultValue as number}
                                        onChange={(e) => handleHyperparameterChange(param.label, Number(e.target.value))}
                                        min={param.min}
                                        max={param.max}
                                        step={param.step}
                                    />
                                    <span className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                                        {hyperparameters[param.label] as number || param.defaultValue as number}
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TimeSeriesBuilder;