"use strict";

// Define the structure for domain-specific configurations
interface DomainConfig {
    id: string;
    name: string;
    description: string;
    modules: {
        dataPipeline: {
            inputs: {
                label: string;
                type: "text" | "number" | "select" | "slider" | "toggle";
                options?: string[] | { value: string; label: string }[];
                defaultValue?: string | number | boolean;
                placeholder?: string;
                min?: number;
                max?: number;
                step?: number;
            }[];
            components: React.ComponentType<any>[];
        };
        modelBuilder: {
            architectures: {
                id: string;
                name: string;
                description: string;
                hyperparameters: {
                    label: string;
                    type: "text" | "number" | "select" | "slider";
                    options?: string[] | { value: string; label: string }[];
                    defaultValue?: string | number;
                    min?: number;
                    max?: number;
                    step?: number;
                }[];
            }[];
            components: React.ComponentType<any>[];
        };
        liveTraining: {
            metrics: string[];
            visualizations: {
                type: "line" | "bar" | "table";
                label: string;
                dataKey: string;
            }[];
            components: React.ComponentType<any>[];
        };
        inferenceSandbox: {
            inputType: "csv" | "array";
            outputVisualization: {
                type: "line" | "bar";
                label: string;
                dataKeys: string[];
            };
            components: React.ComponentType<any>[];
        };
    };
}

// Time-Series Forecasting Domain Configuration
const timeSeriesConfig: DomainConfig = {
    id: "time-series",
    name: "Time-Series Forecasting",
    description: "Forecast future values based on historical time-series data.",
    modules: {
        dataPipeline: {
            inputs: [
                {
                    label: "Time-Step Frequency",
                    type: "select",
                    options: [
                        { value: "hourly", label: "Hourly" },
                        { value: "daily", label: "Daily" },
                        { value: "weekly", label: "Weekly" },
                        { value: "milliseconds", label: "Milliseconds" },
                    ],
                    defaultValue: "daily",
                },
                {
                    label: "Timestamp Column",
                    type: "text",
                    placeholder: "Select timestamp column",
                },
                {
                    label: "Target Variable(s)",
                    type: "text",
                    placeholder: "Select target variable(s)",
                },
                {
                    label: "Lookback Window Size",
                    type: "slider",
                    min: 1,
                    max: 100,
                    step: 1,
                    defaultValue: 10,
                },
                {
                    label: "Horizon Window Size",
                    type: "slider",
                    min: 1,
                    max: 50,
                    step: 1,
                    defaultValue: 5,
                },
                {
                    label: "Log Transformation",
                    type: "toggle",
                    defaultValue: false,
                },
                {
                    label: "First-Order Differencing",
                    type: "toggle",
                    defaultValue: false,
                },
                {
                    label: "Second-Order Differencing",
                    type: "toggle",
                    defaultValue: false,
                },
                {
                    label: "Seasonal Decomposition (STL)",
                    type: "toggle",
                    defaultValue: false,
                },
                {
                    label: "Missing Value Imputation",
                    type: "select",
                    options: [
                        { value: "forward-fill", label: "Forward Fill" },
                        { value: "backward-fill", label: "Backward Fill" },
                        { value: "linear-interpolation", label: "Linear Interpolation" },
                        { value: "spline-interpolation", label: "Spline Interpolation" },
                    ],
                    defaultValue: "forward-fill",
                },
            ],
            components: [require("@/components/etl/TimeSeriesETL").default],
        },
        modelBuilder: {
            architectures: [
                {
                    id: "lstm",
                    name: "LSTM",
                    description: "Long Short-Term Memory networks for sequential data.",
                    hyperparameters: [
                        {
                            label: "Hidden Dimensions",
                            type: "number",
                            defaultValue: 64,
                            min: 8,
                            max: 512,
                        },
                        {
                            label: "Dropout Rate",
                            type: "slider",
                            min: 0,
                            max: 0.9,
                            step: 0.1,
                            defaultValue: 0.2,
                        },
                        {
                            label: "Recurrent Dropout Rate",
                            type: "slider",
                            min: 0,
                            max: 0.9,
                            step: 0.1,
                            defaultValue: 0.2,
                        },
                        {
                            label: "Optimizer",
                            type: "select",
                            options: [
                                { value: "adam", label: "Adam" },
                                { value: "rmsprop", label: "RMSprop" },
                            ],
                            defaultValue: "adam",
                        },
                        {
                            label: "Loss Function",
                            type: "select",
                            options: [
                                { value: "mse", label: "MSE" },
                                { value: "mae", label: "MAE" },
                                { value: "mape", label: "MAPE" },
                                { value: "quantile", label: "Quantile Loss" },
                            ],
                            defaultValue: "mse",
                        },
                    ],
                },
                {
                    id: "gru",
                    name: "GRU",
                    description: "Gated Recurrent Units for sequential data.",
                    hyperparameters: [
                        {
                            label: "Hidden Dimensions",
                            type: "number",
                            defaultValue: 64,
                            min: 8,
                            max: 512,
                        },
                        {
                            label: "Dropout Rate",
                            type: "slider",
                            min: 0,
                            max: 0.9,
                            step: 0.1,
                            defaultValue: 0.2,
                        },
                        {
                            label: "Optimizer",
                            type: "select",
                            options: [
                                { value: "adam", label: "Adam" },
                                { value: "rmsprop", label: "RMSprop" },
                            ],
                            defaultValue: "adam",
                        },
                        {
                            label: "Loss Function",
                            type: "select",
                            options: [
                                { value: "mse", label: "MSE" },
                                { value: "mae", label: "MAE" },
                                { value: "mape", label: "MAPE" },
                            ],
                            defaultValue: "mse",
                        },
                    ],
                },
                {
                    id: "1d-cnn",
                    name: "1D-CNN (Temporal)",
                    description: "1D Convolutional Neural Networks for temporal data.",
                    hyperparameters: [
                        {
                            label: "Number of Filters",
                            type: "number",
                            defaultValue: 32,
                            min: 8,
                            max: 256,
                        },
                        {
                            label: "Kernel Size",
                            type: "number",
                            defaultValue: 3,
                            min: 1,
                            max: 10,
                        },
                        {
                            label: "Dropout Rate",
                            type: "slider",
                            min: 0,
                            max: 0.9,
                            step: 0.1,
                            defaultValue: 0.2,
                        },
                        {
                            label: "Optimizer",
                            type: "select",
                            options: [
                                { value: "adam", label: "Adam" },
                                { value: "rmsprop", label: "RMSprop" },
                            ],
                            defaultValue: "adam",
                        },
                        {
                            label: "Loss Function",
                            type: "select",
                            options: [
                                { value: "mse", label: "MSE" },
                                { value: "mae", label: "MAE" },
                            ],
                            defaultValue: "mse",
                        },
                    ],
                },
                {
                    id: "transformer",
                    name: "Transformer (Informer/PatchTST)",
                    description: "Transformer-based architectures for time-series forecasting.",
                    hyperparameters: [
                        {
                            label: "Number of Attention Heads",
                            type: "number",
                            defaultValue: 4,
                            min: 1,
                            max: 16,
                        },
                        {
                            label: "Dropout Rate",
                            type: "slider",
                            min: 0,
                            max: 0.9,
                            step: 0.1,
                            defaultValue: 0.2,
                        },
                        {
                            label: "Optimizer",
                            type: "select",
                            options: [
                                { value: "adam", label: "Adam" },
                                { value: "rmsprop", label: "RMSprop" },
                            ],
                            defaultValue: "adam",
                        },
                        {
                            label: "Loss Function",
                            type: "select",
                            options: [
                                { value: "mse", label: "MSE" },
                                { value: "mae", label: "MAE" },
                            ],
                            defaultValue: "mse",
                        },
                    ],
                },
                {
                    id: "arima",
                    name: "ARIMA/SARIMAX",
                    description: "Classical statistical models for time-series forecasting.",
                    hyperparameters: [
                        {
                            label: "p (AR Order)",
                            type: "number",
                            defaultValue: 1,
                            min: 0,
                            max: 10,
                        },
                        {
                            label: "d (Differencing Order)",
                            type: "number",
                            defaultValue: 1,
                            min: 0,
                            max: 2,
                        },
                        {
                            label: "q (MA Order)",
                            type: "number",
                            defaultValue: 1,
                            min: 0,
                            max: 10,
                        },
                        {
                            label: "Seasonal Order (P, D, Q)",
                            type: "text",
                            // placeholder: "e.g., 1, 1, 1, 12",
                        },
                    ],
                },
            ],
            components: [require("@/components/builder/TimeSeriesBuilder").default],
        },
        liveTraining: {
            metrics: ["RMSE", "MAE", "MAPE", "Directional Accuracy"],
            visualizations: [
                {
                    type: "line",
                    label: "Loss vs. Validation Loss",
                    dataKey: "loss",
                },
                {
                    type: "table",
                    label: "Forecasting Metrics",
                    dataKey: "metrics",
                },
            ],
            components: [require("@/components/training/TimeSeriesMonitor").default],
        },
        inferenceSandbox: {
            inputType: "csv",
            outputVisualization: {
                type: "line",
                label: "Forecast Visualization",
                dataKeys: ["historical", "predicted"],
            },
            components: [require("@/components/inference/TimeSeriesSandbox").default],
        },
    },
};

// Export all domain configurations
export const domainConfigs: Record<string, DomainConfig> = {
    "time-series": timeSeriesConfig,
};

export type { DomainConfig };