""" 
Coding References and Documentations:
To those who are reading this part of the code, I don't think anyone one have learned data frame before.
Attached here are the links I have added to learn the basics on how all of these work.

https://www.w3schools.com/python/pandas/pandas_dataframes.asp
https://matplotlib.org/stable/plot_types/index.html


It's not too hard to understand

~Carl

"""
import os
import pandas as pd

import seaborn as sns
import matplotlib.pyplot as plt

# Load the dataset
df = pd.read_csv('All_Diets.csv')

# 1. Calculate the average macronutrient content (proteinm, carbs, fat) for each diet type:
avg_macros = df.groupby('Diet_type')[['Protein(g)', 'Carbs(g)', 'Fat(g)']].mean()

# 2. Identify the top 5 protein rich recipes for each diet type:
top_protein = df.sort_values('Protein(g)', ascending=False).groupby('Diet_type').head(5)

# 3. Find the diet type with the highest protein content across all recipes:
highest_protein_diet = df.groupby('Diet_type')['Protein(g)'].mean().idxmax()
highest_protein_val = avg_macros.loc[highest_protein_diet, 'Protein(g)']

# 4. Identify the most common cuisines for each diet types:
common_cuisines = df.groupby('Diet_type')['Cuisine_type'].value_counts().groupby(level=0).head(3)

# 5. Add new metrics (Protein-to-Carbs ratio and Carbs-to-Fat ratio)
df['Protein_to_Carbs_ratio'] = df['Protein(g)'] / df['Carbs(g)']
df['Carbs_to_Fat_ratio'] = df['Carbs(g)'] / df['Fat(g)']

# 6. Handle missing data (fill missing values with mean for numeric columns)
df.fillna(df.mean(numeric_only=True), inplace=True)

#Look it prints the results!
print("SYSTEM: Results of data analysis:")
print("\nMacronutrient content for each diet type:")
print(avg_macros.head(15))

print("\nDiet type with highest average protein content:")
print(highest_protein_diet, highest_protein_val)

print("\nMost common cuisines for each diet type (Top 3):")
print(common_cuisines)

print("\nTop 5 protein rich recipes per diet type)")
print(top_protein[["Diet_type", "Recipe_name", "Cuisine_type", "Protein(g)", "Carbs(g)", "Fat(g)"]].head(15))

# Visualizations through seaborn and matplotlib (Charts and such)
os.makedirs("visualizations", exist_ok=True)

avg_long = avg_macros.reset_index().melt(
    id_vars="Diet_type", 
    value_vars=["Protein(g)", "Carbs(g)", "Fat(g)"], 
    var_name="Macronutrient", 
    value_name="Average Content (g)"
)

# This was annoying to figure out.
# Documentation for seaborn barplot: https://seaborn.pydata.org/generated/seaborn.barplot.html
# Seaborn documentation: https://seaborn.pydata.org/generated/seaborn.heatmap.html
# Matplotlib documentation: https://matplotlib.org/stable/api/_as_gen/matplotlib.pyplot.figure.html

plt.figure(figsize=(12, 6))
sns.barplot(data=avg_long, x="Diet_type", y="Average Content (g)", hue="Macronutrient")
plt.title("Average Macronutrient Content by Diet Type")
plt.ylabel("Average content (g)")
plt.xticks(rotation=45)
plt.tight_layout()
plt.savefig("visualizations/avg_macros_by_diet.png")
plt.close() 

plt.figure(figsize=(10, max(6, int(len(avg_macros.index) * 0.35))))
sns.heatmap(avg_macros, cmap="viridis")
plt.title("Heatmap: Average Macronutrients by Diet Type")
plt.ylabel("Diet_type")
plt.tight_layout()
plt.savefig("visualizations/avg_macros_heatmap.png", dpi=200)
plt.close()

# Scatter plots to display the top 5 protein-rich.
plt.figure(figsize=(16, 7))
sns.scatterplot(
    data=top_protein,
    x="Cuisine_type",
    y="Protein(g)",
    hue="Diet_type"
)

plt.title("Top 5 Protein-Rich Recipes per Diet: Protein by Cuisine")
plt.ylabel("Protein (g)")
plt.xticks(rotation=45, ha="right")
plt.tight_layout()
plt.savefig("visualizations/top5_protein_scatter.png", dpi=200)
plt.close()

# it's over!
print("SYSTEM: Visualizations saved in the 'visualizations' folder.")
