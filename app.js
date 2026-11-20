
// College Library Management System
// Shared application data management

const LibraryDB = {

    // Get stored books
    getBooks() {
        return JSON.parse(
            localStorage.getItem("library_books") || "[]"
        );
    },

    // Save books
    saveBooks(books) {
        localStorage.setItem(
            "library_books",
            JSON.stringify(books)
        );
    },

    // Get registered members
    getMembers() {
        return JSON.parse(
            localStorage.getItem("library_members") || "[]"
        );
    },

    // Save members
    saveMembers(members) {
        localStorage.setItem(
            "library_members",
            JSON.stringify(members)
        );
    },

    // Get issued books
    getIssuedBooks() {
        return JSON.parse(
            localStorage.getItem("library_issued") || "[]"
        );
    },

    // Save issued books
    saveIssuedBooks(records) {
        localStorage.setItem(
            "library_issued",
            JSON.stringify(records)
        );
    },

    // Get reservations
    getReservations() {
        return JSON.parse(
            localStorage.getItem("library_reservations") || "[]"
        );
    },

    // Save reservations
    saveReservations(records) {
        localStorage.setItem(
            "library_reservations",
            JSON.stringify(records)
        );
    },

    // Generate unique IDs
    generateID(prefix) {
        return prefix + Date.now();
    }
};

// Make database functions available to other pages
window.LibraryDB = LibraryDB;
