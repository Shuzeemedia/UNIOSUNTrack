// utils/getRank.js
export const getRank = (present, total) => {
    if (total === 0) return { name: "No Rank", img: "/ranks/non.png" };

    const ratio = present / total;

    if (ratio < 0.1) return { name: "No Rank", img: "/ranks/non.png" };
    if (ratio < 0.25) return { name: "Bronze", img: "/ranks/bronze.png" };
    if (ratio < 0.45) return { name: "Silver", img: "/ranks/silver.png" };
    if (ratio < 0.65) return { name: "Gold", img: "/ranks/gold.png" };
    if (ratio < 0.8) return { name: "Platinum", img: "/ranks/plat.png" };
    if (ratio < 0.9) return { name: "Diamond", img: "/ranks/diamond.png" };
    if (ratio < 0.97) return { name: "Champion", img: "/ranks/champ.png" };
    if (ratio < 1) return { name: "Grand Champion", img: "/ranks/Gchamp.png" };
    return { name: "Star Student League", img: "/ranks/super.png" };
};
