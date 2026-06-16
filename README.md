# Mobile Optimization Task

## Analysis Summary
The website and 3D builder app both need significant mobile responsiveness improvements.

### Issues Found:
1. **Main website (essar.css)**: Buttons stacking, spacing issues, hero text sizing on small screens, stat pills wrapping
2. **3D Builder (App.css)**: Sidebar takes 55vh on mobile (too much), canvas only 45vh (too little), form elements cramped, dim-rows don't collapse to single column on small phones

### Changes to Make:
1. essar.css: Add < 480px breakpoints for better spacing, hero sizing, stat pills, product cards, contact form
2. App.css: Reduce sidebar height on mobile, improve canvas area, better form layout on small screens, add < 480px breakpoint