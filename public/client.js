$(() => {
    var socket = io()
    var room = []

    // Prevent more sockets being created
    delete io

    socket.emit("request data", data => {
        $("#name-input").val(data.name)
        $("#colour-input").val(data.colour)
    })

    socket.emit("request messages", "", messages => {
        for (let msg in messages) {
            appendMessage(msg.sender, msg.content)
        }
    })

    onRoomSubmit()

    $("#msg-form").submit(onSubmit)
    $("#room-form").submit(onRoomSubmit)    
    $("#name-input").on("change paste keyup", onNameInput)
    $("#colour-input").on("change paste keyup", onColourInput)

    socket.on("chat message", appendMessage)
    socket.on("users changed", onUsersChanged)

    requestAndRerenderUsers()

    function onSubmit() {
        let val = $("#m").val()
        if (val.length == 0) {
            return false
        }

        socket.emit("chat message", val)
        $("#m").val("")

        return false
    }

    function onRoomSubmit() {
        let val = $("#room-input").val()

        if (!/(\w|\d|[-.])*/.test(val)) {
            serverMessage("Invalid path: " + val)
            $("#room-input").val("")

            return false
        }

        /* (assuming currently in /hello/world)
         * ~/foo/bar -> [foo, bar]
         * ./foo/ -> [hello, world, foo]
         * ../baz -> [hello, baz]
         * foo -> [hello, world, foo]
         */

        let parsed = parsePathString(val)
        room = resolvePathString(parsed, room)

        let roomID = pathToRoomID(room)

        socket.emit("joined room", roomID)
        
        $("#messages").empty()
        
        serverMessage("You joined the room: ~/" + roomID)

        $("#room-input").val("")
        $("#room-disp").text("~/" + roomID)

        requestAndRerenderUsers()

        return false
    }

    function onNameInput() {
        let val = $(this).val()
        
        if (val.trim().length == 0) {
            return
        }
        
        socket.emit("name change", val)
    }

    function onColourInput() {
        let val = $(this).val()
        
        socket.emit("colour change", val)
    }

    function appendMessage(sender, msg) {
        var elem = $("<li>")
        elem.append($(`<span class="name" style="color: ${sender.colour}">${sender.name}: </span>`))
        elem.append($(`<span>${msg}</span>`))

        $("#messages").append(elem)
    }

    function onUsersChanged(reason, users) {
        renderConnectedUsers(users)
    }

    function renderConnectedUsers(users) {
        let list = $("#users")
        list.empty()

        for (var id in users) {
            if (users.hasOwnProperty(id)) {
                var user = users[id]
                var name = user.name
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#039;")

                var elem = $("<li>")
                elem.append($(`<div class="colour" style="background-color: ${user.colour};"></div>`))
                elem.append($(`<span>${name}</span>`))

                list.append(elem)
            }
        }
    }

    function requestAndRerenderUsers() {
        let users = socket.emit("request users", pathToRoomID(room), renderConnectedUsers)
    }

    function serverMessage(msg) {
        var elem = $("<li>")
        elem.append($(`<span class="name" style="color: lightgrey">Server: </span>`))
        elem.append($(`<span style="color: lightgrey">${msg}</span>`))

        $("#messages").append(elem)
    }

    function parsePathString(path) {
        let tokens = path.split("/")

        return tokens
    }

    function resolvePathString(path, current) {
        var newPath = current

        for (let item of path) {
            item = item.trim()

            switch (item) {
                case "~":
                    newPath = []
                    break

                case ".":
                    break

                case "..":
                    newPath.pop()
                    break

                default:
                    newPath.push(item)
                    break
            }
        }

        return newPath.filter(x => x.length > 0)
    }

    function pathToRoomID(path) {
        return path.join("/")
    }
})