const paths={
 book:'M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-2H4z M20 4h-4a3 3 0 0 0-3 3v14a4 4 0 0 1 4-2h3z',
 home:'m3 10 9-7 9 7 M5 9v11h5v-6h4v6h5V9',
 leaf:'M20 3c-9-1-16 2-16 9a7 7 0 0 0 7 7c7 0 10-7 9-16Z M4 21 16 9 M9 16v-5 M9 16h5',
 settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z',
 arrow:'M4 12h16 m-6-6 6 6-6 6',chevron:'m9 5 7 7-7 7',back:'m14 5-7 7 7 7',
 play:'m9 5 11 7-11 7z',pause:'M8 5v14 M16 5v14',headphones:'M4 13v-2a8 8 0 0 1 16 0v2 M4 12H2v7h5v-7z M20 12h2v7h-5v-7z',
 clock:'M12 8v5l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',check:'m5 12 4 4L20 5',
 download:'M12 3v12 m-5-5 5 5 5-5 M4 16v5h16v-5',close:'m6 6 12 12 M18 6 6 18',
 repeat:'M4 7h14l-3-3 M20 17H6l3 3 M20 7v5 M4 17v-5',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
 mark:'M6 3h12v18l-6-4-6 4z',sun:'M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1 1 M18 18l1 1 M5 19l1-1 M18 6l1-1 M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
 upload:'M12 16V4 m-5 5 5-5 5 5 M4 17v4h16v-4',volume:'m3 9 5 0 5-5v16l-5-5H3z M17 8c3 2 3 6 0 8',
 train:'M6 3h12a2 2 0 0 1 2 2v11a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2Z M4 11h16 M8 3v8 M16 3v8 M7 15h1 M16 15h1 M8 19l-3 3 M16 19l3 3',
 plus:'M12 5v14 M5 12h14',word:'M5 4h14v16H5z M8 8h8 M8 12h5 M8 16h6',next:'m6 5 10 7-10 7z M19 5v14'
};
export function icon(name,size=22){return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${name==='play'?`<path d="${paths[name]}" fill="currentColor" stroke="none"/>`:`<path d="${paths[name]||paths.book}"/>`}</svg>`;}
