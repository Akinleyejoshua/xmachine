"use client";

import React, { useState } from "react";
import { useDomain } from "@/context/DomainContext";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const TimeSeriesSandbox: React.FC = () => {
    const { activeDomain } = useDomain();
    const [inputData, setInputData] = useState<string>("");
    const [forecastData, setForecastData] = useState<{ time: string; historical: number; predicted: number }[]>([]);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputData(e.target.value);
    };

    const handlePredict = () => {
        // Mock prediction for demonstration
        const mockData = [];
        const historical = inputData.split(",").map(Number);
        const lastTime = new Date();
        
        historical.forEach((value, index) => {
            const time = new Date(lastTime);
            time.setDate(lastTime.getDate() - historical.length + index);
            mockData.push({
                time: time.toISOString().split("T")[0],
                historical: value,
                predicted: value, // Historical data
            });
        });

        // Add forecasted data
        for (let i = 1; i <= 5; i++) {
            const time = new Date(lastTime);
            time.setDate(lastTime.getDate() + i);
            mockData.push({
                time: time.toISOString().split("T")[0],
                historical: NaN,
                predicted: historical[historical.length - 1] + (Math.random() * 10 - 5), // Mock prediction
            });
        }
        
        setForecastData(mockData);
    };

    return (
        <div className="p-6 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Inference Sandbox</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                Test your trained time-series model with historical data and visualize predictions.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="flex flex-col">
                    <label className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        Input Data (Comma-Separated Historical Values)
                    </label>
                    <textarea
                        className="p-2 border border-neutral-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 h-32"
                        placeholder="e.g., 10, 20, 30, 40, 50"
                        value={inputData}
                        onChange={handleInputChange}
                    />
                    <button
                        className="mt-4 px-4 py-2 bg-royal-blue-600 text-white rounded-md hover:bg-royal-blue-700 transition-colors"
                        onClick={handlePredict}
                    >
                        Predict
                    </button>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-900 p-4 rounded-lg">
                    <h3 className="text-lg font-medium mb-4">Forecast Visualization</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={forecastData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="time" label={{ value: "Time", position: "insideBottom", offset: -5 }} />
                            <YAxis label={{ value: "Value", angle: -90, position: "insideLeft" }} />
                            <Tooltip />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="historical"
                                stroke="#1e40af"
                                name="Historical Data"
                                strokeWidth={2}
                                dot={false}
                            />
                            <Line
                                type="monotone"
                                dataKey="predicted"
                                stroke="#9333ea"
                                name="Predicted Forecast"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default TimeSeriesSandbox;