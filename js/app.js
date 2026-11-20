
/* =========================================
   COLLEGE LIBRARY MANAGEMENT SYSTEM
   Main Application JavaScript
========================================= */

document.addEventListener("DOMContentLoaded", function () {

    // =====================================
    // 1. DATABASE AND STORAGE
    // =====================================

    const LibraryDB = {
        get(key) {
            try {
                return JSON.parse(localStorage.getItem(key)) || [];
            } catch {
                return [];
            }
        },

        save(key, data) {
            localStorage.setItem(key, JSON.stringify(data));
        },

        getBooks() {
            return this.get("library_books");
        },

        saveBooks(data) {
            this.save("library_books", data);
        },

        getMembers() {
            return this.get("library_members");
        },

        getIssuedBooks() {
            return this.get("library_issued");
        }
    };

    window.LibraryDB = LibraryDB;


    // =====================================
    // 2. PAGE NAVIGATION
    // =====================================

    const navigationButtons = document.querySelectorAll("[data-page]");
    const pages = document.querySelectorAll(".page-section");
    const pageHeading = document.getElementById("page-heading");

    function showPage(pageId) {
        const target = document.getElementById(pageId);

        if (!target) return;

        pages.forEach(page => {
            page.classList.remove("active");
        });

        target.classList.add("active");

        navigationButtons.forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.page === pageId
            );
        });

        const heading = pageId.charAt(0).toUpperCase() +
            pageId.slice(1);

        if (pageHeading) {
            pageHeading.textContent =
                pageId === "books" ? "Book Management" :
                pageId === "issue" ? "Issue Books" :
                pageId === "returns" ? "Return Books" :
                heading;
        }

        if (pageId === "dashboard") {
            updateDashboard();
        }

        if (pageId === "books") {
            renderBooks();
        }

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    navigationButtons.forEach(button => {
        button.addEventListener("click", function () {
            showPage(this.dataset.page);
        });
    });


    // =====================================
    // 3. HELPER FUNCTIONS
    // =====================================

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[char]);
    }

    function getAvailable(book) {
        if (book.availableCopies !== undefined) {
            return Number(book.availableCopies) || 0;
        }

        return Number(book.totalCopies) || 0;
    }

    function getIssuedCount() {
        const issued = LibraryDB.getIssuedBooks();

        return issued.reduce((total, item) => {
            return total + Number(item.quantity || 1);
        }, 0);
    }


    // =====================================
    // 4. BOOK MANAGEMENT
    // =====================================

    const bookForm = document.getElementById("book-form");
    const bookSearch = document.getElementById("book-search");

    function renderBooks() {
        const books = LibraryDB.getBooks();

        const table = document.getElementById("books-table");

        if (!table) return;

        const searchText = bookSearch
            ? bookSearch.value.toLowerCase().trim()
            : "";

        const filteredBooks = books.filter(book => {
            return (
                String(book.title || "").toLowerCase().includes(searchText) ||
                String(book.author || "").toLowerCase().includes(searchText) ||
                String(book.isbn || "").toLowerCase().includes(searchText)
            );
        });

        if (filteredBooks.length === 0) {
            table.innerHTML = `
                <tr>
                    <td colspan="7">
                        ${books.length === 0
                            ? "No books added yet."
                            : "No matching books found."}
                    </td>
                </tr>
            `;
        } else {
            table.innerHTML = filteredBooks.map(book => {
                const available = getAvailable(book);
                const total = Number(book.totalCopies) || 0;

                return `
                    <tr>
                        <td><strong>${escapeHTML(book.title)}</strong></td>
                        <td>${escapeHTML(book.author)}</td>
                        <td>${escapeHTML(book.isbn)}</td>
                        <td>${escapeHTML(book.category)}</td>
                        <td>${total}</td>
                        <td>
                            <span class="status ${available > 0 ? "available" : "issued"}">
                                ${available}
                            </span>
                        </td>
                        <td>
                            <button class="table-action edit-button"
                                data-edit="${escapeHTML(book.id)}">
                                Edit
                            </button>
                            <button class="table-action delete-button"
                                data-delete="${escapeHTML(book.id)}">
                                Delete
                            </button>
                        </td>
                    </tr>
                `;
            }).join("");
        }

        updateBookStatistics();
    }


    function updateBookStatistics() {
        const books = LibraryDB.getBooks();

        const titles = books.length;

        const totalCopies = books.reduce((sum, book) => {
            return sum + (Number(book.totalCopies) || 0);
        }, 0);

        const availableCopies = books.reduce((sum, book) => {
            return sum + getAvailable(book);
        }, 0);

        document.getElementById("book-total-titles").textContent = titles;
        document.getElementById("book-total-copies").textContent = totalCopies;
        document.getElementById("book-available-copies").textContent =
            availableCopies;
    }


    if (bookForm) {
        bookForm.addEventListener("submit", function (event) {
            event.preventDefault();

            const id = document.getElementById("book-edit-id").value;

            const title = document.getElementById("book-title").value.trim();
            const author = document.getElementById("book-author").value.trim();
            const isbn = document.getElementById("book-isbn").value.trim();
            const category = document.getElementById("book-category").value;
            const totalCopies = Number(
                document.getElementById("book-copies").value
            );

            if (!title || !author || !isbn || !category ||
                !Number.isInteger(totalCopies) || totalCopies < 1) {
                alert("Please enter valid details in all fields.");
                return;
            }

            const books = LibraryDB.getBooks();

            const duplicate = books.find(book =>
                String(book.isbn).toLowerCase() === isbn.toLowerCase() &&
                String(book.id) !== String(id)
            );

            if (duplicate) {
                alert("A book with this ISBN already exists.");
                return;
            }

            if (id) {
                const index = books.findIndex(book =>
                    String(book.id) === String(id)
                );

                if (index === -1) {
                    alert("Book record not found.");
                    return;
                }

                const oldBook = books[index];
                const alreadyIssued =
                    Number(oldBook.totalCopies || 0) -
                    getAvailable(oldBook);

                if (totalCopies < alreadyIssued) {
                    alert("Total copies cannot be less than the number of issued copies.");
                    return;
                }

                books[index] = {
                    ...oldBook,
                    title,
                    author,
                    isbn,
                    category,
                    totalCopies,
                    availableCopies: totalCopies - alreadyIssued
                };

                alert("Book updated successfully!");
            } else {
                books.push({
                    id: "BK" + Date.now(),
                    title,
                    author,
                    isbn,
                    category,
                    totalCopies,
                    availableCopies: totalCopies
                });

                alert("Book added successfully!");
            }

            LibraryDB.saveBooks(books);

            bookForm.reset();
            document.getElementById("book-edit-id").value = "";
            document.getElementById("book-submit").textContent = "Add Book";

            renderBooks();
            updateDashboard();
        });
    }


    // =====================================
    // 5. EDIT AND DELETE BOOKS
    // =====================================

    const booksTable = document.getElementById("books-table");

    if (booksTable) {
        booksTable.addEventListener("click", function (event) {

            const editButton = event.target.closest("[data-edit]");
            const deleteButton = event.target.closest("[data-delete]");

            if (editButton) {
                const id = editButton.dataset.edit;
                const book = LibraryDB.getBooks().find(item =>
                    String(item.id) === String(id)
                );

                if (!book) return;

                document.getElementById("book-edit-id").value = book.id;
                document.getElementById("book-title").value = book.title;
                document.getElementById("book-author").value = book.author;
                document.getElementById("book-isbn").value = book.isbn;
                document.getElementById("book-category").value = book.category;
                document.getElementById("book-copies").value = book.totalCopies;

                document.getElementById("book-submit").textContent =
                    "Update Book";

                bookForm.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });
            }

            if (deleteButton) {
                const id = deleteButton.dataset.delete;

                if (!confirm("Are you sure you want to delete this book?")) {
                    return;
                }

                const books = LibraryDB.getBooks();
                const book = books.find(item =>
                    String(item.id) === String(id)
                );

                if (!book) return;

                const issuedCopies =
                    Number(book.totalCopies || 0) -
                    getAvailable(book);

                if (issuedCopies > 0) {
                    alert("This book has issued copies. Return them before deleting it.");
                    return;
                }

                const updatedBooks = books.filter(item =>
                    String(item.id) !== String(id)
                );

                LibraryDB.saveBooks(updatedBooks);

                renderBooks();
                updateDashboard();

                alert("Book deleted successfully!");
            }
        });
    }


    if (bookSearch) {
        bookSearch.addEventListener("input", renderBooks);
    }


    // =====================================
    // 6. DASHBOARD STATISTICS
    // =====================================

    function updateDashboard() {
        const books = LibraryDB.getBooks();
        const members = LibraryDB.getMembers();
        const issued = LibraryDB.getIssuedBooks();

        const totalBooks = books.reduce((sum, book) => {
            return sum + (Number(book.totalCopies) || 0);
        }, 0);

        const availableBooks = books.reduce((sum, book) => {
            return sum + getAvailable(book);
        }, 0);

        const issuedBooks = getIssuedCount();

        document.getElementById("dash-total-books").textContent =
            totalBooks;

        document.getElementById("dash-available-books").textContent =
            availableBooks;

        document.getElementById("dash-issued-books").textContent =
            issuedBooks;

        document.getElementById("dash-members").textContent =
            members.length;

        // Overdue and fines will be connected to the
        // issue and return modules in a later step.

        document.getElementById("dash-overdue").textContent = "0";
        document.getElementById("dash-fines").textContent = "₹0";

        const activityTable =
            document.getElementById("recent-activities");

        if (activityTable) {
            activityTable.innerHTML = `
                <tr>
                    <td colspan="4">
                        ${issued.length
                            ? "Book issue records are available."
                            : "No activities recorded yet."}
                    </td>
                </tr>
            `;
        }
    }


    // =====================================
    // 7. INITIALIZE APPLICATION
    // =====================================

    renderBooks();
    updateDashboard();
    showPage("dashboard");

});
