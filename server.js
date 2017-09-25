// Libraries
var randomColour = require("randomcolor")

// Web server
var express = require("express")
var app = express()

app.use(express.static("public"))

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html")
})

// Sockets
var http = require("http").Server(app)
var io = require("socket.io")(http)

// Data
var users = {
    /* e.g.

    XIubAWUDIaw7dawKd_: {
        name: ...,
        colour: ...,
        room: ...
    },
    ...

    */
}

var messages = {
    "": []
    /* e.g.

    rID: [
        {
            sender: {
                name: ...,
                colour: ...
            },
            content: ...
        }
    ],
    rID2: [
        ...
    ],
    ...

    */
}

io.on("connection", socket => {
    users[socket.client.id] = {
        name: "anon",
        colour: randomColour({
            hue: "blue"
        }),
        room: []
    }
    
    io.to("").emit("users changed", "connect", users)

    socket.on("disconnect", () => {
        let room = users[socket.client.id].room

        delete users[socket.client.id]

        io.to(room).emit("users changed", "disconnect", users)        
    })

    socket.on("chat message", msg => {
        let user = users[socket.client.id]

        messages[user.room].push({
            sender: user,
            content: msg
        })

        io.to(user.room).emit("chat message", user, msg)
    })

    socket.on("name change", name => {
        let user = users[socket.client.id]

        user.name = name

        io.to(user.room).emit("users changed", "rename", users)
    })

    socket.on("colour change", colour => {
        let user = users[socket.client.id]

        user.colour = colour

        io.to(user.room).emit("users changed", "recolour", users)
    })

    socket.on("request data", fn => {
        fn(users[socket.client.id])
    })

    socket.on("request messages", (room, fn) => {
        fn(messages[room])
    })

    socket.on("request users", (room, fn) => {
        fn(usersIn(room))
    })

    socket.on("joined room", id => {
        let oldRoom = users[socket.client.id].room

        for (let room in socket.rooms) {
            if (socket.id !== room) {
                socket.leave(room)
            }
        }

        socket.join(id)

        initialiseRoom(id)
        users[socket.client.id].room = id

        let usersInRoom = usersIn(id)
        let usersInOld = usersIn(oldRoom)
        
        Object.keys(usersInOld).forEach(user => {
            io.to(user).emit("users changed", "disconnect", usersInOld)
        })

        Object.keys(usersInRoom).forEach(user => {
            io.to(user).emit("users changed", "connect", usersInRoom)
        })
    })
})

http.listen(3000, () => {
    console.log("listening on *:3000")
})

function initialiseRoom(id) {
    if (messages[id] === undefined) {
        messages[id] = []
    }
}

function usersIn(room) {
    let filtered = Object.keys(users)
        .filter(key => users[key].room == room)
        .reduce((res, key) => (res[key] = users[key], res), {})

    return filtered
}