"use client";

import React, { useState } from "react";
import { useDomain } from "@/context/DomainContext";

const TimeSeriesETL: React.FC = () => {
    const { activeDomain } = useDomain();
    const [formData, setFormData] = useState<Record<string, string | number | boolean>>({});

    const handleInputChange = (label: string, value: string | number | boolean) => {
        setFormData({
            ...formData,
            [label]: value,
        });
    };

    return (
        <div className="p-6 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Time-Series Data Pipeline</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                Configure temporal alignment, windowing, and stationarity transformations for your time-series data.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activeDomain.modules.dataPipeline.inputs.map((input) => (
                    <div key={input.label} className="flex flex-col">
                        <label className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                            {input.label}
                        </label>
                        {input.type === "select" && (
                            <select
                                className="p-2 border border-neutral-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                                value={formData[input.label] as string || input.defaultValue as string}
                                onChange={(e) => handleInputChange(input.label, e.target.value)}
                            >
                                {input.options?.map((option) => (
                                    <option key={typeof option === "string" ? option : option.value} value={typeof option === "string" ? option : option.value}>
                                        {typeof option === "string" ? option : option.label}
                                    </option>
                                ))}
                            </select>
                        )}
                        {input.type === "text" && (
                            <input
                                type="text"
                                className="p-2 border border-neutral-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                                placeholder={input.placeholder}
                                value={formData[input.label] as string || ""}
                                onChange={(e) => handleInputChange(input.label, e.target.value)}
                            />
                        )}
                        {input.type === "number" && (
                            <input
                                type="number"
                                className="p-2 border border-neutral-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                                value={formData[input.label] as number || input.defaultValue as number}
                                onChange={(e) => handleInputChange(input.label, Number(e.target.value))}
                                min={input.min}
                                max={input.max}
                            />
                        )}
                        {input.type === "slider" && (
                            <div className="flex flex-col">
                                <input
                                    type="range"
                                    className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                                    value={formData[input.label] as number || input.defaultValue as number}
                                    onChange={(e) => handleInputChange(input.label, Number(e.target.value))}
                                    min={input.min}
                                    max={input.max}
                                    step={input.step}
                                />
                                <span className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                                    {formData[input.label] as number || input.defaultValue as number}
                                </span>
                            </div>
                        )}
                        {input.type === "toggle" && (
                            <button
                                type="button"
                                className={`px-4 py-2 rounded-md text-sm font-medium ${formData[input.label] ? "bg-royal-blue-600 text-white" : "bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100"}`}
                                onClick={() => handleInputChange(input.label, !formData[input.label])}
                            >
                                {formData[input.label] ? "Enabled" : "Disabled"}
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TimeSeriesETL;