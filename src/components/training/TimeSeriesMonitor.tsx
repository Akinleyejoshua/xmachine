"use client";

import React, { useState, useEffect } from "react";
import { useDomain } from "@/context/DomainContext";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const TimeSeriesMonitor: React.FC = () => {
    const { activeDomain } = useDomain();
    const [trainingData, setTrainingData] = useState<{ epoch: number; loss: number; val_loss: number }[]>([]);
    const [metrics, setMetrics] = useState<Record<string, number>>({});

    // Mock data for demonstration
    useEffect(() => {
        const mockData = [];
        for (let i = 1; i <= 20; i++) {
            mockData.push({
                epoch: i,
                loss: Math.random() * 0.5 + 0.1,
                val_loss: Math.random() * 0.5 + 0.2,
            });
        }
        setTrainingData(mockData);
        
        const mockMetrics = {
            RMSE: 0.45,
            MAE: 0.32,
            MAPE: 5.1,
            "Directional Accuracy": 0.89,
        };
        setMetrics(mockMetrics);
    }, []);

    return (
        <div className="p-6 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Live Training Monitor</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                Track real-time metrics and visualizations for your time-series model training.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-neutral-50 dark:bg-neutral-900 p-4 rounded-lg">
                    <h3 className="text-lg font-medium mb-4">Loss vs. Validation Loss</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={trainingData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="epoch" label={{ value: "Epoch", position: "insideBottom", offset: -5 }} />
                            <YAxis label={{ value: "Loss", angle: -90, position: "insideLeft" }} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="loss" stroke="#1e40af" name="Training Loss" />
                            <Line type="monotone" dataKey="val_loss" stroke="#9333ea" name="Validation Loss" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-900 p-4 rounded-lg">
                    <h3 className="text-lg font-medium mb-4">Forecasting Metrics</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {activeDomain.modules.liveTraining.metrics.map((metric) => (
                            <div key={metric} className="flex flex-col">
                                <span className="text-sm text-neutral-600 dark:text-neutral-400">{metric}</span>
                                <span className="text-2xl font-semibold">
                                    {metrics[metric] !== undefined ? metrics[metric].toFixed(2) : "N/A"}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TimeSeriesMonitor;