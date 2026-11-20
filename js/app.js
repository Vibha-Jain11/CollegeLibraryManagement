
document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    // =========================================
    // 1. DATABASE AND STORAGE
    // =========================================

    const read = key => {
        try {
            const value = JSON.parse(localStorage.getItem(key));
            return Array.isArray(value) ? value : [];
        } catch {
            return [];
        }
    };

    const save = (key, value) => {
        localStorage.setItem(key, JSON.stringify(value));
    };

    const DB = {
        books: () => read("library_books"),
        members: () => read("library_members"),
        issued: () => read("library_issued"),
        reservations: () => read("library_reservations"),
        fines: () => read("library_fines"),
        activities: () => read("library_activities"),

        saveBooks: value => save("library_books", value),
        saveMembers: value => save("library_members", value),
        saveIssued: value => save("library_issued", value),
        saveReservations: value => save("library_reservations", value),
        saveFines: value => save("library_fines", value),
        saveActivities: value => save("library_activities", value)
    };

    window.LibraryDB = DB;

    const defaultSettings = {
        name: "College Library",
        open: "09:00",
        close: "17:00",
        limit: 5,
        period: 14,
        fine: 5
    };

    function getSettings() {
        try {
            return {
                ...defaultSettings,
                ...JSON.parse(localStorage.getItem("library_settings") || "{}")
            };
        } catch {
            return { ...defaultSettings };
        }
    }

    function saveSettings(settings) {
        localStorage.setItem("library_settings", JSON.stringify(settings));
    }


    // =========================================
    // 2. COMMON FUNCTIONS
    // =========================================

    const $ = id => document.getElementById(id);

    const makeId = prefix =>
        prefix + Date.now() + Math.floor(Math.random() * 1000);

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[char]);
    }

    function todayString() {
        const date = new Date();
        const offset = date.getTimezoneOffset();
        return new Date(date.getTime() - offset * 60000)
            .toISOString().slice(0, 10);
    }

    function addDays(dateString, days) {
        const date = new Date(dateString + "T12:00:00");
        date.setDate(date.getDate() + Number(days));
        return date.toISOString().slice(0, 10);
    }

    function dayDifference(start, end) {
        const a = new Date(start + "T00:00:00");
        const b = new Date(end + "T00:00:00");
        return Math.max(0, Math.floor((b - a) / 86400000));
    }

    function formatDate(value) {
        if (!value) return "—";
        return new Date(value + "T00:00:00")
            .toLocaleDateString("en-IN");
    }

    function money(value) {
        return "₹" + Number(value || 0).toLocaleString("en-IN");
    }

    function available(book) {
        return Math.max(
            0,
            Number(book.availableCopies ?? book.totalCopies) || 0
        );
    }

    function setting(name) {
        return Number(getSettings()[name]);
    }

    function logActivity(member, activity, book) {
        const activities = DB.activities();

        activities.unshift({
            id: makeId("ACT"),
            date: todayString(),
            member,
            activity,
            book
        });

        DB.saveActivities(activities.slice(0, 30));
    }

    function statusBadge(text, type) {
        return `<span class="status ${type}">${escapeHTML(text)}</span>`;
    }

    function setOptions(select, records, labelFunction, placeholder) {
        if (!select) return;

        const oldValue = select.value;

        select.innerHTML =
            `<option value="">${placeholder}</option>` +
            records.map(record =>
                `<option value="${escapeHTML(record.id)}">${escapeHTML(labelFunction(record))}</option>`
            ).join("");

        if (records.some(record => String(record.id) === oldValue)) {
            select.value = oldValue;
        }
    }


    // =========================================
    // 3. NAVIGATION
    // =========================================

    const sections = document.querySelectorAll(".page-section");

    const pageNames = {
        dashboard: "Dashboard",
        books: "Book Management",
        members: "Members",
        issue: "Issue Books",
        returns: "Return Books",
        reservations: "Reservations",
        fines: "Fines",
        reports: "Reports",
        settings: "Settings"
    };

    function showPage(id) {
        const target = $(id);

        if (!target || !target.classList.contains("page-section")) {
            return;
        }

        sections.forEach(section => {
            section.classList.toggle("active", section.id === id);
        });

        document.querySelectorAll(".nav-link").forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.page === id
            );
        });

        $("page-heading").textContent = pageNames[id] || "Library";

        refreshAll();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    document.addEventListener("click", event => {
        const button = event.target.closest("[data-page]");

        if (!button) return;

        event.preventDefault();
        showPage(button.dataset.page);
    });


    // =========================================
    // 4. BOOK MANAGEMENT
    // =========================================

    function renderBooks() {
        const books = DB.books();
        const search = $("book-search").value.trim().toLowerCase();

        const filtered = books.filter(book =>
            [book.title, book.author, book.isbn, book.category]
                .some(value =>
                    String(value || "").toLowerCase().includes(search)
                )
        );

        $("books-table").innerHTML = filtered.length
            ? filtered.map(book => `
                <tr>
                    <td><strong>${escapeHTML(book.title)}</strong></td>
                    <td>${escapeHTML(book.author)}</td>
                    <td>${escapeHTML(book.isbn)}</td>
                    <td>${escapeHTML(book.category)}</td>
                    <td>${Number(book.totalCopies)}</td>
                    <td>${available(book)}</td>
                    <td>
                        <button class="table-action edit-button"
                            data-action="edit-book"
                            data-id="${escapeHTML(book.id)}">Edit</button>

                        <button class="table-action delete-button"
                            data-action="delete-book"
                            data-id="${escapeHTML(book.id)}">Delete</button>
                    </td>
                </tr>
            `).join("")
            : `<tr><td colspan="7">No matching books found.</td></tr>`;

        $("book-titles").textContent = books.length;

        $("book-copies-total").textContent =
            books.reduce((sum, book) =>
                sum + Number(book.totalCopies || 0), 0);

        $("book-copies-available").textContent =
            books.reduce((sum, book) =>
                sum + available(book), 0);
    }

    function resetBookForm() {
        $("book-form").reset();
        $("book-id").value = "";
        $("book-form-heading").textContent = "Add New Book";
        $("book-save").textContent = "Add Book";
        $("book-cancel").hidden = true;
    }

    $("book-form").addEventListener("submit", event => {
        event.preventDefault();

        const id = $("book-id").value;
        const title = $("book-title").value.trim();
        const author = $("book-author").value.trim();
        const isbn = $("book-isbn").value.trim();
        const category = $("book-category").value;
        const quantity = Number($("book-quantity").value);

        if (!title || !author || !isbn || !category ||
            !Number.isInteger(quantity) || quantity < 1) {
            alert("Please enter valid book details.");
            return;
        }

        const books = DB.books();

        if (books.some(book =>
            book.isbn.toLowerCase() === isbn.toLowerCase() &&
            String(book.id) !== String(id)
        )) {
            alert("This ISBN already exists.");
            return;
        }

        if (id) {
            const index = books.findIndex(book =>
                String(book.id) === id
            );

            if (index < 0) return;

            const old = books[index];
            const issuedCopies =
                Number(old.totalCopies) - available(old);

            if (quantity < issuedCopies) {
                alert("Total copies cannot be lower than issued copies.");
                return;
            }

            books[index] = {
                ...old,
                title,
                author,
                isbn,
                category,
                totalCopies: quantity,
                availableCopies: quantity - issuedCopies
            };

            logActivity("Administrator", "Book Updated", title);

        } else {
            books.push({
                id: makeId("BK"),
                title,
                author,
                isbn,
                category,
                totalCopies: quantity,
                availableCopies: quantity
            });

            logActivity("Administrator", "Book Added", title);
        }

        DB.saveBooks(books);
        resetBookForm();
        refreshAll();

        alert(id ? "Book updated successfully." : "Book added successfully.");
    });

    $("book-cancel").addEventListener("click", resetBookForm);
    $("book-search").addEventListener("input", renderBooks);


    // =========================================
    // 5. MEMBER MANAGEMENT
    // =========================================

    function renderMembers() {
        const members = DB.members();
        const search = $("member-search").value.toLowerCase().trim();

        const filtered = members.filter(member =>
            [
                member.name,
                member.collegeId,
                member.email,
                member.phone
            ].some(value =>
                String(value || "").toLowerCase().includes(search)
            )
        );

        $("members-table").innerHTML = filtered.length
            ? filtered.map(member => `
                <tr>
                    <td>${escapeHTML(member.name)}</td>
                    <td>${escapeHTML(member.collegeId)}</td>
                    <td>${escapeHTML(member.email)}</td>
                    <td>${escapeHTML(member.phone)}</td>
                    <td>${escapeHTML(member.type)}</td>
                    <td>${escapeHTML(member.department)}</td>
                    <td>
                        <button class="table-action edit-button"
                            data-action="edit-member"
                            data-id="${escapeHTML(member.id)}">Edit</button>

                        <button class="table-action delete-button"
                            data-action="delete-member"
                            data-id="${escapeHTML(member.id)}">Delete</button>
                    </td>
                </tr>
            `).join("")
            : `<tr><td colspan="7">No members found.</td></tr>`;

        setOptions(
            $("issue-member"),
            members,
            member => `${member.name} (${member.collegeId})`,
            "Select member"
        );

        setOptions(
            $("reservation-member"),
            members,
            member => `${member.name} (${member.collegeId})`,
            "Select member"
        );
    }

    function resetMemberForm() {
        $("member-form").reset();
        $("member-id").value = "";
        $("member-form-heading").textContent = "Register New Member";
        $("member-save").textContent = "Register Member";
        $("member-cancel").hidden = true;
    }

    $("member-form").addEventListener("submit", event => {
        event.preventDefault();

        const id = $("member-id").value;

        const member = {
            id: id || makeId("MEM"),
            name: $("member-name").value.trim(),
            collegeId: $("member-college-id").value.trim(),
            email: $("member-email").value.trim(),
            phone: $("member-phone").value.trim(),
            type: $("member-type").value,
            department: $("member-department").value.trim()
        };

        const members = DB.members();

        if (members.some(item =>
            item.collegeId.toLowerCase() ===
                member.collegeId.toLowerCase() &&
            String(item.id) !== String(id)
        )) {
            alert("This college ID is already registered.");
            return;
        }

        if (id) {
            const index = members.findIndex(item =>
                String(item.id) === id
            );

            if (index < 0) return;
            members[index] = member;
        } else {
            members.push(member);
        }

        DB.saveMembers(members);

        logActivity(
            member.name,
            id ? "Member Updated" : "Member Registered",
            "—"
        );

        resetMemberForm();
        refreshAll();

        alert(id ? "Member updated." : "Member registered successfully.");
    });

    $("member-cancel").addEventListener("click", resetMemberForm);
    $("member-search").addEventListener("input", renderMembers);


    // =========================================
    // 6. ISSUE BOOKS
    // =========================================

    function refreshIssueOptions() {
        const books = DB.books().filter(book => available(book) > 0);

        setOptions(
            $("issue-book"),
            books,
            book => `${book.title} — ${available(book)} available`,
            "Select available book"
        );
    }

    function renderIssued() {
        const records = DB.issued();
        const search = $("issue-search").value.toLowerCase().trim();

        const filtered = records.filter(record =>
            !record.returned &&
            [
                record.memberName,
                record.bookTitle,
                record.memberId
            ].some(value =>
                String(value || "").toLowerCase().includes(search)
            )
        );

        $("issued-table").innerHTML = filtered.length
            ? filtered.map(record => {
                const overdue = record.dueDate < todayString();

                return `
                    <tr>
                        <td>${escapeHTML(record.memberName)}</td>
                        <td>${escapeHTML(record.bookTitle)}</td>
                        <td>${formatDate(record.issueDate)}</td>
                        <td>${formatDate(record.dueDate)}</td>
                        <td>
                            ${statusBadge(
                                overdue ? "Overdue" : "Issued",
                                overdue ? "overdue" : "issued"
                            )}
                        </td>
                    </tr>
                `;
            }).join("")
            : `<tr><td colspan="5">No active issue records.</td></tr>`;

        refreshIssueOptions();
    }

    $("issue-date").value = todayString();
    $("issue-due").value = addDays(
        todayString(),
        setting("period")
    );

    $("issue-date").addEventListener("change", () => {
        if ($("issue-date").value) {
            $("issue-due").value = addDays(
                $("issue-date").value,
                setting("period")
            );
        }
    });

    $("issue-form").addEventListener("submit", event => {
        event.preventDefault();

        const memberId = $("issue-member").value;
        const bookId = $("issue-book").value;
        const issueDate = $("issue-date").value;
        const dueDate = $("issue-due").value;

        const member = DB.members().find(item =>
            item.id === memberId
        );

        const books = DB.books();
        const book = books.find(item => item.id === bookId);

        if (!member || !book) {
            alert("Please select a valid member and book.");
            return;
        }

        if (!issueDate || !dueDate || dueDate < issueDate) {
            alert("Please enter valid issue and due dates.");
            return;
        }

        const activeForMember = DB.issued().filter(item =>
            item.memberId === memberId && !item.returned
        ).length;

        if (activeForMember >= setting("limit")) {
            alert("This member has reached the maximum book limit.");
            return;
        }

        if (available(book) < 1) {
            alert("No available copies of this book.");
            return;
        }

        book.availableCopies = available(book) - 1;
        DB.saveBooks(books);

        const records = DB.issued();

        records.push({
            id: makeId("ISS"),
            memberId,
            memberName: member.name,
            bookId,
            bookTitle: book.title,
            issueDate,
            dueDate,
            returned: false
        });

        DB.saveIssued(records);

        logActivity(member.name, "Book Issued", book.title);

        $("issue-form").reset();
        $("issue-date").value = todayString();
        $("issue-due").value = addDays(
            todayString(),
            setting("period")
        );

        refreshAll();
        alert("Book issued successfully.");
    });

    $("issue-search").addEventListener("input", renderIssued);


    // =========================================
    // PART 2 CONTINUES BELOW
    // =========================================

    // =========================================
    // 7. RETURN BOOKS AND FINE CALCULATION
    // =========================================

    function renderReturns() {
        const records = DB.issued().filter(item => !item.returned);

        $("returns-table").innerHTML = records.length
            ? records.map(record => {
                const overdue = record.dueDate < todayString();

                return `
                    <tr>
                        <td>${escapeHTML(record.memberName)}</td>
                        <td>${escapeHTML(record.bookTitle)}</td>
                        <td>${formatDate(record.dueDate)}</td>
                        <td>
                            ${statusBadge(
                                overdue ? "Overdue" : "On time",
                                overdue ? "overdue" : "available"
                            )}
                        </td>
                        <td>
                            <button class="table-action return-button"
                                data-action="return-book"
                                data-id="${escapeHTML(record.id)}">
                                Return
                            </button>
                        </td>
                    </tr>
                `;
            }).join("")
            : `<tr><td colspan="5">No books are currently issued.</td></tr>`;
    }

    function processReturn(id) {
        const records = DB.issued();

        const record = records.find(item =>
            item.id === id && !item.returned
        );

        if (!record) return;

        const today = todayString();
        const overdueDays = dayDifference(record.dueDate, today);
        const fineAmount = overdueDays * setting("fine");

        if (!confirm(
            `Return "${record.bookTitle}" for ${record.memberName}?\n` +
            `Overdue days: ${overdueDays}\n` +
            `Fine: ${money(fineAmount)}`
        )) return;

        record.returned = true;
        record.returnDate = today;

        DB.saveIssued(records);

        const books = DB.books();
        const book = books.find(item => item.id === record.bookId);

        if (book) {
            book.availableCopies = Math.min(
                Number(book.totalCopies),
                available(book) + 1
            );

            DB.saveBooks(books);
        }

        if (fineAmount > 0) {
            const fines = DB.fines();

            fines.push({
                id: makeId("FINE"),
                issueId: record.id,
                memberId: record.memberId,
                memberName: record.memberName,
                bookTitle: record.bookTitle,
                overdueDays,
                amount: fineAmount,
                paid: false,
                date: today
            });

            DB.saveFines(fines);
        }

        logActivity(
            record.memberName,
            "Book Returned",
            record.bookTitle
        );

        refreshAll();

        alert(
            fineAmount > 0
                ? `Book returned. Fine generated: ${money(fineAmount)}`
                : "Book returned successfully. No fine due."
        );
    }


    // =========================================
    // 8. RESERVATIONS
    // =========================================

    function renderReservations() {
        const records = DB.reservations();

        $("reservations-table").innerHTML = records.length
            ? records.map(record => `
                <tr>
                    <td>${escapeHTML(record.memberName)}</td>
                    <td>${escapeHTML(record.bookTitle)}</td>
                    <td>${formatDate(record.date)}</td>
                    <td>
                        ${statusBadge(
                            record.status,
                            record.status === "Cancelled"
                                ? "overdue"
                                : "pending"
                        )}
                    </td>
                    <td>
                        ${record.status === "Pending" ? `
                            <button class="table-action edit-button"
                                data-action="complete-reservation"
                                data-id="${escapeHTML(record.id)}">
                                Complete
                            </button>

                            <button class="table-action delete-button"
                                data-action="cancel-reservation"
                                data-id="${escapeHTML(record.id)}">
                                Cancel
                            </button>
                        ` : "—"}
                    </td>
                </tr>
            `).join("")
            : `<tr><td colspan="5">No reservations found.</td></tr>`;

        setOptions(
            $("reservation-book"),
            DB.books(),
            book => book.title,
            "Select book"
        );
    }

    $("reservation-form").addEventListener("submit", event => {
        event.preventDefault();

        const member = DB.members().find(item =>
            item.id === $("reservation-member").value
        );

        const book = DB.books().find(item =>
            item.id === $("reservation-book").value
        );

        if (!member || !book) {
            alert("Select a valid member and book.");
            return;
        }

        const records = DB.reservations();

        records.push({
            id: makeId("RES"),
            memberId: member.id,
            memberName: member.name,
            bookId: book.id,
            bookTitle: book.title,
            date: todayString(),
            status: "Pending"
        });

        DB.saveReservations(records);

        logActivity(
            member.name,
            "Book Reserved",
            book.title
        );

        $("reservation-form").reset();
        refreshAll();

        alert("Reservation created successfully.");
    });


    // =========================================
    // 9. FINE MANAGEMENT
    // =========================================

    function renderFines() {
        const fines = DB.fines();

        const pending = fines
            .filter(fine => !fine.paid)
            .reduce((sum, fine) =>
                sum + Number(fine.amount), 0
            );

        const collected = fines
            .filter(fine => fine.paid)
            .reduce((sum, fine) =>
                sum + Number(fine.amount), 0
            );

        $("fine-pending").textContent = money(pending);
        $("fine-collected").textContent = money(collected);

        $("fines-table").innerHTML = fines.length
            ? fines.map(fine => `
                <tr>
                    <td>${escapeHTML(fine.memberName)}</td>
                    <td>${escapeHTML(fine.bookTitle)}</td>
                    <td>${fine.overdueDays}</td>
                    <td>${money(fine.amount)}</td>
                    <td>
                        ${statusBadge(
                            fine.paid ? "Paid" : "Pending",
                            fine.paid ? "paid" : "pending"
                        )}
                    </td>
                    <td>
                        ${fine.paid ? "—" : `
                            <button class="table-action return-button"
                                data-action="pay-fine"
                                data-id="${escapeHTML(fine.id)}">
                                Mark Paid
                            </button>
                        `}
                    </td>
                </tr>
            `).join("")
            : `<tr><td colspan="6">No fine records found.</td></tr>`;
    }


    // =========================================
    // 10. REPORTS
    // =========================================

    function renderReports() {
        const books = DB.books();
        const members = DB.members();

        const issues = DB.issued().filter(item => !item.returned);

        const reservations = DB.reservations().filter(item =>
            item.status === "Pending"
        );

        $("report-titles").textContent = books.length;

        $("report-copies").textContent = books.reduce(
            (sum, book) => sum + Number(book.totalCopies || 0),
            0
        );

        $("report-members").textContent = members.length;
        $("report-issues").textContent = issues.length;
        $("report-reservations").textContent = reservations.length;
    }

    $("print-report").addEventListener("click", () => {
        showPage("reports");
        window.print();
    });

    $("export-report").addEventListener("click", () => {
        const books = DB.books();

        const rows = [
            [
                "Title",
                "Author",
                "ISBN",
                "Category",
                "Total Copies",
                "Available Copies"
            ],
            ...books.map(book => [
                book.title,
                book.author,
                book.isbn,
                book.category,
                book.totalCopies,
                available(book)
            ])
        ];

        const csv = rows.map(row =>
            row.map(value =>
                '"' + String(value ?? "").replace(/"/g, '""') + '"'
            ).join(",")
        ).join("\r\n");

        const blob = new Blob(["\uFEFF" + csv], {
            type: "text/csv;charset=utf-8;"
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "library-books-report.csv";
        link.click();

        URL.revokeObjectURL(url);
    });


    // =========================================
    // 11. SETTINGS
    // =========================================

    function loadSettings() {
        const s = getSettings();

        $("setting-name").value = s.name;
        $("setting-open").value = s.open;
        $("setting-close").value = s.close;
        $("setting-limit").value = s.limit;
        $("setting-period").value = s.period;
        $("setting-fine").value = s.fine;
    }

    $("settings-form").addEventListener("submit", event => {
        event.preventDefault();

        const settings = {
            name: $("setting-name").value.trim(),
            open: $("setting-open").value,
            close: $("setting-close").value,
            limit: Number($("setting-limit").value),
            period: Number($("setting-period").value),
            fine: Number($("setting-fine").value)
        };

        if (
            !settings.name ||
            !settings.open ||
            !settings.close ||
            settings.limit < 1 ||
            settings.period < 1 ||
            settings.fine < 0 ||
            settings.close <= settings.open
        ) {
            alert("Please enter valid library settings.");
            return;
        }

        saveSettings(settings);

        alert("Library settings saved successfully.");
    });


    // =========================================
    // 12. TABLE ACTIONS
    // =========================================

    document.addEventListener("click", event => {
        const button = event.target.closest("[data-action]");

        if (!button) return;

        const id = button.dataset.id;
        const action = button.dataset.action;

        // EDIT BOOK
        if (action === "edit-book") {
            const book = DB.books().find(item => item.id === id);
            if (!book) return;

            $("book-id").value = book.id;
            $("book-title").value = book.title;
            $("book-author").value = book.author;
            $("book-isbn").value = book.isbn;
            $("book-category").value = book.category;
            $("book-quantity").value = book.totalCopies;

            $("book-form-heading").textContent = "Edit Book";
            $("book-save").textContent = "Update Book";
            $("book-cancel").hidden = false;

            $("book-form").scrollIntoView({
                behavior: "smooth"
            });
        }

        // DELETE BOOK
        if (action === "delete-book") {
            const books = DB.books();
            const book = books.find(item => item.id === id);

            if (!book) return;

            if (
                Number(book.totalCopies) - available(book) > 0
            ) {
                alert(
                    "Return all issued copies before deleting this book."
                );
                return;
            }

            if (!confirm("Delete this book?")) return;

            DB.saveBooks(
                books.filter(item => item.id !== id)
            );

            logActivity(
                "Administrator",
                "Book Deleted",
                book.title
            );

            refreshAll();
        }

        // EDIT MEMBER
        if (action === "edit-member") {
            const member = DB.members().find(item => item.id === id);
            if (!member) return;

            $("member-id").value = member.id;
            $("member-name").value = member.name;
            $("member-college-id").value = member.collegeId;
            $("member-email").value = member.email;
            $("member-phone").value = member.phone;
            $("member-type").value = member.type;
            $("member-department").value = member.department;

            $("member-form-heading").textContent = "Edit Member";
            $("member-save").textContent = "Update Member";
            $("member-cancel").hidden = false;

            $("member-form").scrollIntoView({
                behavior: "smooth"
            });
        }

        // DELETE MEMBER
        if (action === "delete-member") {
            const members = DB.members();
            const member = members.find(item => item.id === id);

            if (!member) return;

            const hasActiveIssue = DB.issued().some(item =>
                item.memberId === id && !item.returned
            );

            if (hasActiveIssue) {
                alert(
                    "This member has an active book issue. Return the book first."
                );
                return;
            }

            if (!confirm("Delete this member?")) return;

            DB.saveMembers(
                members.filter(item => item.id !== id)
            );

            refreshAll();
        }

        // RETURN BOOK
        if (action === "return-book") {
            processReturn(id);
        }

        // COMPLETE RESERVATION
        if (action === "complete-reservation") {
            const records = DB.reservations();
            const record = records.find(item => item.id === id);

            if (record && record.status === "Pending") {
                record.status = "Completed";
                DB.saveReservations(records);
                refreshAll();
            }
        }

        // CANCEL RESERVATION
        if (action === "cancel-reservation") {
            const records = DB.reservations();
            const record = records.find(item => item.id === id);

            if (
                record &&
                record.status === "Pending" &&
                confirm("Cancel this reservation?")
            ) {
                record.status = "Cancelled";
                DB.saveReservations(records);
                refreshAll();
            }
        }

        // PAY FINE
        if (action === "pay-fine") {
            const records = DB.fines();
            const fine = records.find(item => item.id === id);

            if (
                fine &&
                !fine.paid &&
                confirm(`Mark ${money(fine.amount)} as paid?`)
            ) {
                fine.paid = true;
                fine.paidDate = todayString();

                DB.saveFines(records);
                refreshAll();
            }
        }
    });


    // =========================================
    // 13. DASHBOARD
    // =========================================

    function updateDashboard() {
        const books = DB.books();
        const members = DB.members();

        const issues = DB.issued().filter(item =>
            !item.returned
        );

        const fines = DB.fines().filter(item =>
            !item.paid
        );

        const totalCopies = books.reduce(
            (sum, book) =>
                sum + Number(book.totalCopies || 0),
            0
        );

        const availableCopies = books.reduce(
            (sum, book) =>
                sum + available(book),
            0
        );

        const overdue = issues.filter(item =>
            item.dueDate < todayString()
        );

        const pending = fines.reduce(
            (sum, fine) =>
                sum + Number(fine.amount || 0),
            0
        );

        $("dash-total-books").textContent = totalCopies;
        $("dash-available").textContent = availableCopies;
        $("dash-issued").textContent = issues.length;
        $("dash-members").textContent = members.length;
        $("dash-overdue").textContent = overdue.length;
        $("dash-fines").textContent = money(pending);

        const activities = DB.activities();

        $("activity-table").innerHTML = activities.length
            ? activities.slice(0, 8).map(item => `
                <tr>
                    <td>${formatDate(item.date)}</td>
                    <td>${escapeHTML(item.member)}</td>
                    <td>${escapeHTML(item.activity)}</td>
                    <td>${escapeHTML(item.book)}</td>
                </tr>
            `).join("")
            : `<tr><td colspan="4">No activities recorded yet.</td></tr>`;
    }


    // =========================================
    // 14. REFRESH ALL MODULES
    // =========================================

    function refreshAll() {
        renderBooks();
        renderMembers();
        refreshIssueOptions();
        renderIssued();
        renderReturns();
        renderReservations();
        renderFines();
        renderReports();
        updateDashboard();
    }


    // =========================================
    // 15. INITIALIZE APPLICATION
    // =========================================

    loadSettings();

    $("issue-date").value = todayString();

    $("issue-due").value = addDays(
        todayString(),
        setting("period")
    );

    refreshAll();
    showPage("dashboard");

});
